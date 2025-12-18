import { pool } from "@/lib/neon";
import { evaluateSignal } from "./evaluateSignal";
import { executeTradeIntent, closeTrade } from "./executionHelpers";

import { riskGate } from "@/lib/trading/risk/riskGate";
import { halaalGate } from "@/lib/trading/compliance/halaalGate";

type ExecResult =
  | { success: true; action: string }
  | { success: false; reason: string };

// Sprint-18 paper size
const PAPER_QTY = 0.01;

export async function executeSignal(
  signalId: string,
  price: number
): Promise<ExecResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* 1) Lock signal */
    const { rows: signals } = await client.query(
      `SELECT * FROM signals WHERE id = $1 FOR UPDATE`,
      [signalId]
    );

    if (!signals.length) {
      await client.query("ROLLBACK");
      return { success: false, reason: "SIGNAL_NOT_FOUND" };
    }

    const signal = signals[0];

    if (signal.status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return { success: false, reason: "SIGNAL_NOT_ACTIVE" };
    }

    /* 2) Lock open trades */
    const { rows: openTrades } = await client.query(
      `SELECT * FROM paper_trades WHERE signal_id = $1 FOR UPDATE`,
      [signalId]
    );

    const hasOpenTrade = openTrades.length > 0;

    /* 3) Intent */
    const intent = evaluateSignal(signal, price, hasOpenTrade);

    if (!intent) {
      await client.query("ROLLBACK");
      return { success: true, action: "NOOP" };
    }

    /* 🔒 Prevent duplicate OPENs */
    if (intent.type === "OPEN" && hasOpenTrade) {
      await client.query("ROLLBACK");
      return { success: true, action: "ALREADY_OPEN" };
    }

    /* 4) Log execution */
    const { rows: execRows } = await client.query(
      `
      INSERT INTO trade_executions (signal_id, intent, status)
      VALUES ($1, $2, 'PENDING')
      RETURNING id
      `,
      [signalId, intent.type]
    );

    const executionId = execRows[0].id;

    /* 5) Risk gate */
    if (intent.type === "OPEN") {
      const risk = await riskGate(signal, price);
      if (!risk.allowed) {
        await client.query(
          `
          UPDATE trade_executions
          SET status = 'FAILED', error = $2
          WHERE id = $1
          `,
          [executionId, risk.reason]
        );
        await client.query("ROLLBACK");
        return { success: false, reason: risk.reason };
      }
    }

    /* 6) Halaal gate */
    if (intent.type === "OPEN") {
      const halaal = await halaalGate(signal);
      if (!halaal.allowed) {
        await client.query(
          `
          UPDATE trade_executions
          SET status = 'FAILED', error = $2
          WHERE id = $1
          `,
          [executionId, halaal.reason]
        );
        await client.query("ROLLBACK");
        return { success: false, reason: halaal.reason };
      }
    }

    /* 7) Execute */
    let result;
    if (intent.type !== "OPEN" && !openTrades.length) {
      await client.query("ROLLBACK");
      return { success: false, reason: "NO_OPEN_TRADE" };
    }

    switch (intent.type) {
      case "OPEN":
        result = await executeTradeIntent({
          signalId,
          symbol: signal.symbol,
          qty: PAPER_QTY,
          side: signal.direction,
        });
        break;

      case "TP1_PARTIAL":
        result = await closeTrade(
          openTrades[0].id,
          signal.tp1_qty ?? undefined
        );
        break;

      case "TP2_CLOSE":
      case "SL_CLOSE":
      case "EXPIRED_CLOSE":
        result = await closeTrade(openTrades[0].id);
        break;

      default:
        result = { success: false, error: "UNKNOWN_INTENT" };
    }

    if (!result?.success) {
      await client.query(
        `
        UPDATE trade_executions
        SET status = 'FAILED', error = $2
        WHERE id = $1
        `,
        [executionId, result?.error ?? "EXECUTION_FAILED"]
      );
      await client.query("ROLLBACK");
      return { success: false, reason: "EXECUTION_FAILED" };
    }

    /* 8) Finalise */
    const riskAmount =
      signal.sl !== null ? Math.abs(price - Number(signal.sl)) * PAPER_QTY : 0;

    await client.query(
      `
      UPDATE trade_executions
      SET status = 'SUCCESS', risk_amount = $2
      WHERE id = $1
      `,
      [executionId, riskAmount]
    );

    await client.query("COMMIT");
    return { success: true, action: intent.type };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("executeSignal error:", err);
    return { success: false, reason: "INTERNAL_ERROR" };
  } finally {
    client.release();
  }
}
