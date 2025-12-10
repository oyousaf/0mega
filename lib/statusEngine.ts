import { pool } from "@/lib/neon";
import { getPrice } from "@/providers";
import { getBroker } from "@/providers/execution/router";
import { calcQty } from "@/lib/trading/positionSizing";

import {
  prettyStatus,
  canonicalStatus,
  AllowedStatus,
} from "@/lib/signal/status";

const PRICE_THRESHOLD = 0.05;

/* ------------------------------------------
   State machine
------------------------------------------ */
function evaluateState(signal: any, price: number): string {
  const entry = Number(signal.entry_price);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const sl = Number(signal.sl);

  const prevPretty = prettyStatus(signal.status);
  const prev = canonicalStatus(prevPretty);

  if (prev === "CLOSED") return "CLOSED";
  if ([entry, tp1, tp2, sl].some((v) => isNaN(v))) return prev;

  const dir = signal.direction?.toUpperCase() ?? "BUY";

  if (dir === "BUY") {
    if (price >= tp2) return "TP2_HIT";
    if (price >= tp1) return "TP1_HIT";
    if (price <= sl) return "SL_HIT";
    return "ACTIVE";
  }

  if (dir === "SELL") {
    if (price <= tp2) return "TP2_HIT";
    if (price <= tp1) return "TP1_HIT";
    if (price >= sl) return "SL_HIT";
    return "ACTIVE";
  }

  return prev;
}

/* ------------------------------------------
   Expiry
------------------------------------------ */
function isExpired(signal: any): boolean {
  const created = new Date(signal.created_at);
  const now = new Date();
  return (now.getTime() - created.getTime()) / 86400000 >= 7;
}

function finalise(raw: string): string {
  const s = raw.toUpperCase();
  if (["TP1_HIT", "TP2_HIT", "SL_HIT", "EXPIRED"].includes(s)) {
    return "CLOSED";
  }
  return s;
}

/* ------------------------------------------
   DB writes
------------------------------------------ */
async function updateSignalRow(id: number, canonical: string, price: number) {
  const pretty = canonical.replace(/_/g, " ");

  await pool.query(
    `
    UPDATE signals
    SET 
      status = $1,
      current_price = $2,
      updated_at = NOW()
    WHERE id = $3
  `,
    [pretty, price, id]
  );
}

/* ------------------------------------------
   Automation execution hook
------------------------------------------ */
async function executeAutomation(signal: any, state: string) {
  const broker = getBroker();

  // open trade
  if (state === "ACTIVE" && !signal.order_id) {
    const qty = await calcQty(signal.symbol, signal.type);
    const res = await broker.openTrade(signal.symbol, qty, signal.direction);

    if (res.success) {
      await pool.query(
        `UPDATE signals SET order_id = $1, opened_qty = $2 WHERE id = $3`,
        [res.orderId, qty, signal.id]
      );
    }

    return;
  }

  // partial
  if (state === "TP1_HIT" && signal.order_id && !signal.tp1_hit) {
    const half = Number(signal.opened_qty) / 2;

    await broker.closeTrade(signal.order_id);
    await pool.query(
      `
      UPDATE signals
      SET tp1_hit = TRUE,
          opened_qty = opened_qty - $1
      WHERE id = $2
    `,
      [half, signal.id]
    );

    return;
  }

  // full close
  if (["TP2_HIT", "SL_HIT"].includes(state) && signal.order_id) {
    await broker.closeTrade(signal.order_id);
    await pool.query(
      `UPDATE signals SET order_id = NULL, opened_qty = 0 WHERE id = $1`,
      [signal.id]
    );
  }
}

/* ------------------------------------------
   Main engine
------------------------------------------ */
export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    if (signal.processing) continue;

    // lock
    await pool.query(`UPDATE signals SET processing = TRUE WHERE id = $1`, [
      signal.id,
    ]);

    try {
      const prevPretty: AllowedStatus = prettyStatus(signal.status);
      const prev = canonicalStatus(prevPretty);
      const oldPrice = Number(signal.current_price ?? 0);

      const price = await getPrice(signal.symbol, signal.type);

      let raw = evaluateState(signal, price);
      if (isExpired(signal)) raw = "EXPIRED";

      const final = finalise(raw);

      const changed = final !== prev;
      const priceMoved = Math.abs(price - oldPrice) >= PRICE_THRESHOLD;

      if (!changed && !priceMoved) continue;

      await updateSignalRow(signal.id, final, price);

      if (changed) {
        await executeAutomation(signal, final);
      }
    } finally {
      await pool.query(`UPDATE signals SET processing = FALSE WHERE id = $1`, [
        signal.id,
      ]);
    }
  }
}
