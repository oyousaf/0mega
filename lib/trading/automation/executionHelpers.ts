import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";
import type { OrderSide } from "@/providers/execution/broker.interface";

function reverseSide(side: OrderSide): OrderSide {
  return side === "BUY" ? "SELL" : "BUY";
}

/* -------------------------------------------------
   OPEN TRADE (FILL LEVEL)
-------------------------------------------------- */
export async function executeTradeIntent(intent: {
  signalId: string;
  symbol: string;
  qty: number;
  side: OrderSide;
}) {
  if (intent.qty <= 0) {
    return { success: false, error: "INVALID_QTY" };
  }

  const broker = getBroker();

  const res = await broker.placeOrder(
    intent.symbol,
    intent.qty,
    intent.side
  );

  if (!res.success || !res.price) {
    return { success: false, error: res.error ?? "ORDER_FAILED" };
  }

  const { rows } = await pool.query(
    `
    INSERT INTO paper_trades (
      signal_id,
      symbol,
      side,
      entry_price,
      qty
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [
      intent.signalId,
      intent.symbol,
      intent.side,
      res.price,
      intent.qty,
    ]
  );

  const tradeId = rows[0].id;

  await pool.query(
    `
    INSERT INTO trade_executions (
      trade_id,
      side,
      qty,
      price,
      broker,
      order_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'SUCCESS')
    `,
    [
      tradeId,
      intent.side,
      intent.qty,
      res.price,
      "paper",
      res.orderId ?? null,
    ]
  );

  return { success: true, tradeId };
}

/* -------------------------------------------------
   CLOSE TRADE (FILL LEVEL)
-------------------------------------------------- */
export async function closeTrade(tradeId: string, qty?: number) {
  const broker = getBroker();

  const { rows } = await pool.query(
    `
    SELECT id, side, qty
    FROM paper_trades
    WHERE id = $1
    FOR UPDATE
    `,
    [tradeId]
  );

  if (!rows.length) {
    return { success: false, error: "TRADE_NOT_FOUND" };
  }

  const trade = rows[0];
  const closeQty = qty ?? Number(trade.qty);

  if (closeQty <= 0 || closeQty > Number(trade.qty)) {
    return { success: false, error: "INVALID_CLOSE_QTY" };
  }

  const res = await broker.closeOrder(tradeId, closeQty);

  if (!res.success || !res.price) {
    return { success: false, error: res.error ?? "CLOSE_FAILED" };
  }

  await pool.query(
    `
    INSERT INTO trade_executions (
      trade_id,
      side,
      qty,
      price,
      broker,
      order_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'SUCCESS')
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

  if (closeQty < Number(trade.qty)) {
    await pool.query(
      `UPDATE paper_trades SET qty = qty - $1 WHERE id = $2`,
      [closeQty, tradeId]
    );
  } else {
    await pool.query(
      `DELETE FROM paper_trades WHERE id = $1`,
      [tradeId]
    );
  }

  return { success: true };
}
