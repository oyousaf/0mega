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

function normaliseLevels(params: {
  side: OrderSide;
  entry: number;
  rawSl: number;
  rawTp1: number | null;
}) {
  const entry = assertFinite(params.entry, "INVALID_ENTRY");
  const rawSl = assertFinite(params.rawSl, "INVALID_SL");

  const risk = Math.abs(entry - rawSl);
  if (risk <= 0) throw new Error("INVALID_RISK_DISTANCE");

  const reward =
    params.rawTp1 != null
      ? Math.abs(assertFinite(params.rawTp1, "INVALID_TP") - entry)
      : null;

  if (params.side === "BUY") {
    return {
      sl: entry - risk,
      tp1: reward != null ? entry + reward : null,
    };
  }

  return {
    sl: entry + risk,
    tp1: reward != null ? entry - reward : null,
  };
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
}): Promise<OpenResult> {
  try {
    const qty = assertFinite(intent.qty, "INVALID_QTY");
    if (qty <= 0) return { success: false, error: "INVALID_QTY" };

    const broker = getBroker();
    const res = await broker.placeOrder(intent.symbol, qty, intent.side);

    if (!res.success) {
      return { success: false, error: res.error ?? "ORDER_FAILED" };
    }

    const entry = assertFinite(res.price, "NO_ENTRY_PRICE");

    const { sl, tp1 } = normaliseLevels({
      side: intent.side,
      entry,
      rawSl: intent.rawSl,
      rawTp1: intent.rawTp1 ?? null,
    });

    const geometryOk =
      intent.side === "BUY"
        ? sl < entry && (tp1 ?? Infinity) > entry
        : sl > entry && (tp1 ?? -Infinity) < entry;

    if (!geometryOk) {
      return { success: false, error: "INVALID_GEOMETRY" };
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
      ]
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
      [tradeId, intent.side, qty, entry, res.orderId ?? null, riskAmount]
    );

    return { success: true, tradeId };
  } catch (err: any) {
    return { success: false, error: err.message ?? "OPEN_FAILED" };
  }
}

/* -------------------------------------------------
   CLOSE TRADE
-------------------------------------------------- */
export async function closeTrade(
  tradeId: number,
  qty?: number
): Promise<CloseResult> {
  try {
    const id = assertFinite(tradeId, "INVALID_TRADE_ID");

    const { rows } = await pool.query(
      `
      SELECT side, qty, entry_price, risk_amount
      FROM paper_trades
      WHERE id = $1 AND is_closed = false
      FOR UPDATE
      `,
      [id]
    );

    if (!rows.length) {
      return { success: false, error: "TRADE_NOT_FOUND" };
    }

    const trade = rows[0];
    const openQty = assertFinite(trade.qty, "INVALID_QTY");

    const closeQty =
      qty != null ? assertFinite(qty, "INVALID_CLOSE_QTY") : openQty;

    if (closeQty <= 0 || closeQty > openQty) {
      return { success: false, error: "INVALID_CLOSE_QTY" };
    }

    const broker = getBroker();
    const res = await broker.closeOrder(String(id), closeQty);

    if (!res.success) {
      return { success: false, error: res.error ?? "CLOSE_FAILED" };
    }

    const exitPrice = assertFinite(res.price, "NO_EXIT_PRICE");

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
      [
        id,
        reverseSide(trade.side),
        closeQty,
        exitPrice,
        res.orderId ?? null,
        trade.risk_amount,
      ]
    );

    if (closeQty < openQty) {
      await pool.query(`UPDATE paper_trades SET qty = qty - $1 WHERE id = $2`, [
        closeQty,
        id,
      ]);
    } else {
      const realised =
        trade.side === "BUY"
          ? (exitPrice - trade.entry_price) * openQty
          : (trade.entry_price - exitPrice) * openQty;

      await pool.query(
        `
        UPDATE paper_trades
        SET qty = 0, is_closed = true, realised_pl = $1
        WHERE id = $2
        `,
        [realised, id]
      );
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "CLOSE_FAILED" };
  }
}
