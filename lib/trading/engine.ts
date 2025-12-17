import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";
import type { OrderSide } from "@/providers/execution/broker.interface";

function reverseSide(side: OrderSide): OrderSide {
  return side === "BUY" ? "SELL" : "BUY";
}

/* -------------------------------------------------
   OPEN TRADE (fill-level only)
-------------------------------------------------- */
export async function executeTradeIntent(intent: {
  signalId: string;
  symbol: string;
  qty: number;
  side: OrderSide;
}) {
  const broker = getBroker();

  const res = await broker.placeOrder(intent.symbol, intent.qty, intent.side);

  if (!res.success || !res.price) {
    return { success: false, error: res.error ?? "ORDER_FAILED" };
  }

  // Persist paper trade WITH signal linkage
  const { rows } = await pool.query(
    `
    INSERT INTO paper_trades (signal_id, symbol, side, entry_price, qty)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [intent.signalId, intent.symbol, intent.side, res.price, intent.qty]
  );

  const tradeId = rows[0].id;

  // Fill-level execution only
  await pool.query(
    `
    INSERT INTO trade_executions (
      trade_id,
      side,
      qty,
      price,
      broker,
      order_id,
      timestamp
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `,
    [tradeId, intent.side, intent.qty, res.price, "paper", res.orderId ?? null]
  );

  return { success: true, tradeId };
}

/* -------------------------------------------------
   CLOSE TRADE (fill-level only)
-------------------------------------------------- */
export async function closeTrade(tradeId: string, qty?: number) {
  const broker = getBroker();

  const { rows } = await pool.query(
    `SELECT side, qty FROM paper_trades WHERE id = $1`,
    [tradeId]
  );

  if (!rows.length) {
    return { success: false, error: "TRADE_NOT_FOUND" };
  }

  const trade = rows[0];
  const closeQty = qty ?? Number(trade.qty);

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
      timestamp
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
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

  if (qty && closeQty < Number(trade.qty)) {
    await pool.query(`UPDATE paper_trades SET qty = qty - $1 WHERE id = $2`, [
      closeQty,
      tradeId,
    ]);
  } else {
    await pool.query(`DELETE FROM paper_trades WHERE id = $1`, [tradeId]);
  }

  return { success: true };
}
