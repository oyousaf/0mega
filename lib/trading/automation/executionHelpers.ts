import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";
import type { OrderSide } from "@/providers/execution/broker.interface";

/* -------------------------------------------------
   TYPES
-------------------------------------------------- */
export type OpenResult =
  | { success: true; tradeId: number }
  | { success: false; error: string };

export type CloseResult = { success: true } | { success: false; error: string };

/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */
function reverseSide(side: OrderSide): OrderSide {
  return side === "BUY" ? "SELL" : "BUY";
}

function assertFinite(n: unknown, err: string): number {
  const v = Number(n);
  if (!Number.isFinite(v)) throw new Error(err);
  return v;
}

function assertPositive(n: number, err: string) {
  if (!(n > 0)) throw new Error(err);
}

/**
 * Demo-safe validation
 */
function validateLevelDistance(params: {
  entry: number;
  level: number;
  label: "SL" | "TP1";
}) {
  const { entry, level, label } = params;

  assertPositive(entry, "ENTRY_NON_POSITIVE");
  assertPositive(level, `${label}_NON_POSITIVE`);

  const dist = Math.abs(entry - level);

  if (dist < entry * 0.0003) {
    throw new Error(`${label}_TOO_CLOSE`);
  }

  if (dist > entry * 0.5) {
    throw new Error(`${label}_TOO_FAR`);
  }
}

/* -------------------------------------------------
   OPEN TRADE
-------------------------------------------------- */
export async function executeTradeIntent(intent: {
  signalId: string;
  symbol: string;
  qty: number;
  side: OrderSide;
  rawSl: number;
  rawTp1?: number | null;
  entryPrice?: number;
}): Promise<OpenResult> {
  try {
    const qty = assertFinite(intent.qty, "INVALID_QTY");
    if (qty <= 0) return { success: false, error: "INVALID_QTY" };

    const broker = getBroker();
    const res = await broker.placeOrder(intent.symbol, qty, intent.side);

    if (!res.success || !Number.isFinite(res.price)) {
      return { success: false, error: res.error ?? "ORDER_FAILED" };
    }

    const entry =
      intent.entryPrice != null
        ? assertFinite(intent.entryPrice, "INVALID_ENTRY")
        : assertFinite(res.price, "NO_ENTRY_PRICE");

    const sl = assertFinite(intent.rawSl, "INVALID_SL");
    const tp1 =
      intent.rawTp1 != null ? assertFinite(intent.rawTp1, "INVALID_TP") : null;

    validateLevelDistance({ entry, level: sl, label: "SL" });
    if (tp1 != null) validateLevelDistance({ entry, level: tp1, label: "TP1" });

    const geometryOk =
      intent.side === "BUY"
        ? sl < entry && (tp1 ?? Infinity) > entry
        : sl > entry && (tp1 ?? -Infinity) < entry;

    if (!geometryOk) {
      return {
        success: false,
        error: `INVALID_GEOMETRY entry=${entry} sl=${sl} tp1=${
          tp1 ?? "null"
        } side=${intent.side}`,
      };
    }

    const riskAmount = Math.abs(entry - sl) * qty;
    const rr =
      tp1 != null ? Math.abs(tp1 - entry) / Math.abs(entry - sl) : null;

    const { rows } = await pool.query(
      `
      INSERT INTO paper_trades (
        signal_id,
        symbol,
        side,
        entry_price,
        qty,
        sl,
        tp1,
        rr,
        risk_amount,
        is_closed,
        realised_pl
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,NULL)
      RETURNING id
      `,
      [
        intent.signalId,
        intent.symbol,
        intent.side,
        entry,
        qty,
        sl,
        tp1,
        rr,
        riskAmount,
      ],
    );

    const tradeId = assertFinite(rows[0]?.id, "TRADE_ID_MISSING");

    await pool.query(
      `
      INSERT INTO trade_executions (
        trade_id,
        side,
        qty,
        price,
        broker,
        order_id,
        status,
        risk_amount,
        error,
        timestamp
      )
      VALUES ($1,$2,$3,$4,'paper',$5,'FILLED',$6,NULL,NOW())
      `,
      [tradeId, intent.side, qty, entry, res.orderId ?? null, riskAmount],
    );

    return { success: true, tradeId };
  } catch (err: any) {
    return { success: false, error: err.message ?? "OPEN_FAILED" };
  }
}

/* -------------------------------------------------
   CLOSE TRADE (FAST PAPER SAFE)
-------------------------------------------------- */
export async function closeTrade(
  tradeId: number,
  reason: "SL_HIT" | "TP_HIT" | "MANUAL",
  exitPrice: number,
): Promise<CloseResult> {
  const client = await pool.connect();

  try {
    const id = assertFinite(tradeId, "INVALID_TRADE_ID");
    const exit = assertFinite(exitPrice, "INVALID_EXIT_PRICE");

    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      SELECT side, qty, entry_price, risk_amount
      FROM paper_trades
      WHERE id = $1 AND is_closed = false
      FOR UPDATE
      `,
      [id],
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return { success: false, error: "TRADE_ALREADY_CLOSED" };
    }

    const trade = rows[0];
    const qty = assertFinite(trade.qty, "INVALID_QTY");

    const realised =
      trade.side === "BUY"
        ? (exit - trade.entry_price) * qty
        : (trade.entry_price - exit) * qty;

    await client.query(
      `
      UPDATE paper_trades
      SET
        is_closed = true,
        realised_pl = $1,
        exit_price = $2,
        exit_reason = $3,
        closed_at = NOW()
      WHERE id = $4
      `,
      [realised, exit, reason, id],
    );

    await client.query(
      `
      INSERT INTO trade_executions (
        trade_id,
        side,
        qty,
        price,
        broker,
        status,
        risk_amount,
        timestamp
      )
      VALUES ($1,$2,$3,$4,'paper','FILLED',$5,NOW())
      `,
      [id, reverseSide(trade.side), qty, exit, trade.risk_amount],
    );

    await client.query("COMMIT");
    return { success: true };
  } catch (err: any) {
    await client.query("ROLLBACK");
    return { success: false, error: err.message ?? "CLOSE_FAILED" };
  } finally {
    client.release();
  }
}
