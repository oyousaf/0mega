import { pool } from "@/lib/neon";
import { evaluateSignal } from "./evaluateSignal";
import { executeTradeIntent, closeTrade } from "./executionHelpers";

import { riskGate } from "@/lib/trading/risk/riskGate";
import { halaalGate } from "@/lib/trading/compliance/halaalGate";

type ExecResult =
  | { success: true; action: string }
  | { success: false; reason: string };

const PAPER_QTY = 0.01;

export async function executeSignal(
  signalId: string,
  price: number
): Promise<ExecResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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

    const { rows: openTrades } = await client.query(
      `SELECT * FROM paper_trades WHERE is_closed = false LIMIT 1 FOR UPDATE`
    );

    const hasOpenTrade = openTrades.length > 0;

    const intent = evaluateSignal(signal, price, hasOpenTrade);
    if (!intent) {
      await client.query("ROLLBACK");
      return { success: true, action: "NOOP" };
    }

    if (intent.type === "OPEN" && hasOpenTrade) {
      await client.query("ROLLBACK");
      return { success: true, action: "ALREADY_OPEN" };
    }

    if (intent.type === "OPEN") {
      const risk = await riskGate(signal, price);
      if (!risk.allowed) {
        await client.query("ROLLBACK");
        return { success: false, reason: risk.reason };
      }

      const halaal = await halaalGate(signal);
      if (!halaal.allowed) {
        await client.query("ROLLBACK");
        return { success: false, reason: halaal.reason };
      }
    }

    let actionResult:
      | { success: true; tradeId?: number }
      | { success: false; error: string };

    switch (intent.type) {
      case "OPEN": {
        const rawSl = Number(signal.sl);
        const rawTp1 = signal.tp1 != null ? Number(signal.tp1) : null;

        actionResult = await executeTradeIntent({
          signalId,
          symbol: signal.symbol,
          qty: PAPER_QTY,
          side: signal.direction,
          rawSl,
          rawTp1,
        });
        break;
      }

      case "TP1_PARTIAL": {
        const tradeId = Number(openTrades[0].id);
        const qty = signal.tp1_qty != null ? Number(signal.tp1_qty) : undefined;

        actionResult = await closeTrade(tradeId, qty);
        break;
      }

      case "TP2_CLOSE":
      case "SL_CLOSE":
      case "EXPIRED_CLOSE": {
        const tradeId = Number(openTrades[0].id);
        actionResult = await closeTrade(tradeId);
        break;
      }

      default:
        actionResult = { success: false, error: "UNKNOWN_INTENT" };
    }

    if (!actionResult.success) {
      await client.query("ROLLBACK");
      return { success: false, reason: actionResult.error };
    }

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
