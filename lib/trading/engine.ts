import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";
import type { OrderSide } from "@/providers/execution/broker.interface";

/* -------------------------------------------------
   Types
-------------------------------------------------- */
export type TradeIntent = {
  symbol: string;
  qty: number;
  side: OrderSide; // BUY | SELL
};

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function reverseSide(side: OrderSide): OrderSide {
  return side === "BUY" ? "SELL" : "BUY";
}

/* -------------------------------------------------
   OPEN TRADE (manual, dry-run)
-------------------------------------------------- */
export async function executeTradeIntent(intent: TradeIntent) {
  const broker = getBroker();

  // 1) Execute with broker
  const res = await broker.placeOrder(intent.symbol, intent.qty, intent.side);

  if (!res.success || !res.price) {
    return {
      success: false,
      error: res.error ?? "Order placement failed",
    };
  }

  // 2) Persist paper trade (DB generates id)
  const { rows } = await pool.query(
    `
    INSERT INTO paper_trades (symbol, side, entry_price, qty)
    VALUES ($1, $2, $3, $4)
    RETURNING id
    `,
    [intent.symbol, intent.side, res.price, intent.qty]
  );

  const tradeId = String(rows[0].id);

  // 3) Persist execution (BUY/SELL only)
  await pool.query(
    `
    INSERT INTO trade_executions (trade_id, side, qty, price, order_id)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [tradeId, intent.side, intent.qty, res.price, res.orderId ?? null]
  );

  return { success: true, tradeId };
}

/* -------------------------------------------------
   CLOSE TRADE
-------------------------------------------------- */
export async function closeTrade(tradeId: string, qty?: number) {
  const broker = getBroker();

  // 1) Load trade
  const { rows } = await pool.query(
    `SELECT side, qty FROM paper_trades WHERE id = $1`,
    [tradeId]
  );

  if (!rows.length) {
    return { success: false, error: "Trade not found" };
  }

  const trade = rows[0];
  const closeQty = qty ?? Number(trade.qty);

  // 2) Execute close
  const res = await broker.closeOrder(tradeId, closeQty);

  if (!res.success || !res.price) {
    return {
      success: false,
      error: res.error ?? "Close failed",
    };
  }

  // 3) Persist close execution
  await pool.query(
    `
    INSERT INTO trade_executions (trade_id, side, qty, price, order_id)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [tradeId, reverseSide(trade.side), closeQty, res.price, res.orderId ?? null]
  );

  // 4) Update or delete trade
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
