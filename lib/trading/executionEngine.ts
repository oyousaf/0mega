import { getBroker } from "@/providers/execution/router";
import { calcQty } from "./positionSizing";
import { pool } from "@/lib/neon";

export async function executeForSignal(signal: any, event: string) {
  const broker = getBroker();

  // OPEN TRADE
  if (event === "ACTIVE" && !signal.order_id) {
    const qty = await calcQty(signal.symbol, signal.type);

    const res = await broker.openTrade(signal.symbol, qty, signal.direction);
    if (!res.success) return;

    await pool.query(
      `UPDATE signals SET order_id = $1, opened_qty = $2 WHERE id = $3`,
      [res.orderId, qty, signal.id]
    );
    return;
  }

  // PARTIAL CLOSE 50% ON TP1
  if (event === "TP1_HIT" && signal.order_id && !signal.tp1_hit) {
    await pool.query(`UPDATE signals SET tp1_hit = TRUE WHERE id = $1`, [
      signal.id,
    ]);

    const halfQty = Number(signal.opened_qty) / 2;

    const res = await broker.partialClose(signal.order_id, halfQty);
    if (!res.success) return;

    // reduce remaining qty
    await pool.query(
      `UPDATE signals SET opened_qty = opened_qty - $1 WHERE id = $2`,
      [halfQty, signal.id]
    );

    return;
  }

  // FULL CLOSE ON TP2
  if (event === "TP2_HIT" && signal.order_id) {
    await broker.closeTrade(signal.order_id);

    await pool.query(
      `UPDATE signals SET order_id = NULL, opened_qty = 0 WHERE id = $1`,
      [signal.id]
    );

    return;
  }

  // FULL CLOSE ON SL
  if (event === "SL_HIT" && signal.order_id) {
    await broker.closeTrade(signal.order_id);

    await pool.query(
      `UPDATE signals SET order_id = NULL, opened_qty = 0 WHERE id = $1`,
      [signal.id]
    );

    return;
  }
}
