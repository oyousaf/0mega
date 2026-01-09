import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";
import type { OrderSide } from "@/providers/execution/broker.interface";

function reverseSide(side: OrderSide): OrderSide {
  return side === "BUY" ? "SELL" : "BUY";
}

/* -------------------------------------------------
   OPEN TRADE (SINGLE AUTHORITY)
-------------------------------------------------- */
export async function executeTradeIntent(intent: {
  signalId: string;
  symbol: string;
  qty: number;
  side: OrderSide;
  rr?: number | null;
}) {
  if (!Number.isFinite(intent.qty) || intent.qty <= 0) {
    return { success: false, error: "INVALID_QTY" };
  }

  const broker = getBroker();
  const res = await broker.placeOrder(intent.symbol, intent.qty, intent.side);

  if (!res.success || !Number.isFinite(res.price)) {
    return { success: false, error: res.error ?? "ORDER_FAILED" };
  }

  /* -----------------------------
     Persist trade
  ------------------------------ */
  const { rows } = await pool.query(
    `
    INSERT INTO paper_trades (
      signal_id,
      symbol,
      side,
      entry_price,
      qty,
      rr,
      is_closed,
      realised_pl
    )
    VALUES ($1, $2, $3, $4, $5, $6, false, NULL)
    RETURNING id
    `,
    [
      intent.signalId,
      intent.symbol,
      intent.side,
      res.price,
      intent.qty,
      intent.rr ?? null,
    ]
  );

  const tradeId = rows[0].id;

  /* -----------------------------
     Fill-level execution
  ------------------------------ */
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
      timestamp
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'FILLED', NOW())
    `,
    [tradeId, intent.side, intent.qty, res.price, "paper", res.orderId ?? null]
  );

  return { success: true, tradeId };
}

/* -------------------------------------------------
   CLOSE / PARTIAL CLOSE
-------------------------------------------------- */
export async function closeTrade(tradeId: string, qty?: number) {
  const broker = getBroker();

  const { rows } = await pool.query(
    `
    SELECT side, qty, entry_price
    FROM paper_trades
    WHERE id = $1
      AND is_closed = false
    FOR UPDATE
    `,
    [tradeId]
  );

  if (!rows.length) {
    return { success: false, error: "TRADE_NOT_FOUND" };
  }

  const trade = rows[0];
  const closeQty = qty ?? Number(trade.qty);

  if (!Number.isFinite(closeQty) || closeQty <= 0 || closeQty > trade.qty) {
    return { success: false, error: "INVALID_CLOSE_QTY" };
  }

  const res = await broker.closeOrder(tradeId, closeQty);

  if (!res.success || res.price == null || !Number.isFinite(res.price)) {
    return { success: false, error: res.error ?? "ORDER_FAILED" };
  }

  const price: number = res.price;

  /* -----------------------------
     Fill-level close execution
  ------------------------------ */
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
      timestamp
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'FILLED', NOW())
    `,
    [
      tradeId,
      reverseSide(trade.side),
      closeQty,
      res.price,
      "paper",
      res.orderId ?? null,
    ]
  );

  /* -----------------------------
     Partial vs final close
  ------------------------------ */
  if (closeQty < trade.qty) {
    await pool.query(
      `
      UPDATE paper_trades
      SET qty = qty - $1
      WHERE id = $2
      `,
      [closeQty, tradeId]
    );
  } else {
    const realised =
      trade.side === "BUY"
        ? (res.price - trade.entry_price) * trade.qty
        : (trade.entry_price - res.price) * trade.qty;

    await pool.query(
      `
      UPDATE paper_trades
      SET
        qty = 0,
        is_closed = true,
        realised_pl = $1
      WHERE id = $2
      `,
      [realised, tradeId]
    );
  }

  return { success: true };
}
