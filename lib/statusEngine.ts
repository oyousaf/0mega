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

/* -----------------------------------------------------
   EVALUATE NEW SIGNAL STATE
----------------------------------------------------- */
function evaluateState(signal: any, price: number): string {
  const entry = Number(signal.entry_price);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const sl = Number(signal.sl);

  const prevPretty = prettyStatus(signal.status);
  const prev = canonicalStatus(prevPretty);
  if (prev === "CLOSED") return "CLOSED";

  const dir = signal.direction?.toUpperCase() ?? "BUY";

  if ([entry, tp1, tp2, sl].some((v) => isNaN(v))) return prev;

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

/* -----------------------------------------------------
   EXPIRATION
----------------------------------------------------- */
function isExpired(signal: any): boolean {
  const created = new Date(signal.created_at);
  return (Date.now() - created.getTime()) / 86400000 >= 7;
}

/* -----------------------------------------------------
   FINALISATION
----------------------------------------------------- */
function finalizeState(raw: string): string {
  const s = raw.toUpperCase();
  if (["TP1_HIT", "TP2_HIT", "SL_HIT", "EXPIRED"].includes(s)) {
    return "CLOSED";
  }
  return s;
}

/* -----------------------------------------------------
   DB UPDATE
----------------------------------------------------- */
async function updateSignal(id: number, canonical: string, price: number) {
  const pretty = canonical.replace(/_/g, " ");
  await pool.query(
    `
    UPDATE signals
    SET status = $1,
        current_price = $2,
        updated_at = NOW()
    WHERE id = $3
    `,
    [pretty, price, id]
  );
}

async function logEvent(id: number, event: string, price: number) {
  try {
    await pool.query(
      `
      INSERT INTO signal_history (signal_id, event, price, timestamp)
      VALUES ($1, $2, $3, NOW())
      `,
      [id, event, price]
    );
  } catch {}
}

/* -----------------------------------------------------
   MERGED ENGINE
----------------------------------------------------- */
export async function runStatusEngine(signals: any[]) {
  const broker = getBroker();

  for (const signal of signals) {
    if (signal.processing === true) continue;

    await pool.query(`UPDATE signals SET processing = TRUE WHERE id = $1`, [
      signal.id,
    ]);

    try {
      const prevPretty: AllowedStatus = prettyStatus(signal.status);
      const prev = canonicalStatus(prevPretty);

      const oldPrice = Number(signal.current_price ?? 0);
      const price = await getPrice(signal.symbol, signal.type);

      // 1. state evaluation
      let raw = evaluateState(signal, price);

      // 2. expired?
      if (isExpired(signal)) raw = "EXPIRED";

      // 3. finalisation
      const next = finalizeState(raw);

      const statusChanged = next !== prev;
      const priceChanged = Math.abs(price - oldPrice) >= PRICE_THRESHOLD;

      // *** EXECUTION LAYER ***
      if (statusChanged) {
        // A) ACTIVE → open trade
        if (next === "ACTIVE" && !signal.order_id) {
          const qty = await calcQty(signal.symbol, signal.type);
          const res = await broker.openTrade(signal.symbol, qty, signal.direction);

          if (res.success) {
            await pool.query(
              `UPDATE signals SET order_id = $1, opened_qty = $2 WHERE id = $3`,
              [res.orderId, qty, signal.id]
            );
          }
        }

        // B) TP1_HIT → partial close
        if (next === "TP1_HIT" && signal.order_id && !signal.tp1_hit) {
          const qty = Number(signal.opened_qty) / 2;
          await broker.partialClose(signal.order_id, qty);

          await pool.query(
            `UPDATE signals SET tp1_hit = TRUE, opened_qty = opened_qty - $1 WHERE id = $2`,
            [qty, signal.id]
          );
        }

        // C) TP2_HIT → full close
        if (next === "TP2_HIT" && signal.order_id) {
          await broker.closeTrade(signal.order_id);

          await pool.query(
            `UPDATE signals SET order_id = NULL, opened_qty = 0 WHERE id = $1`,
            [signal.id]
          );
        }

        // D) SL_HIT → full close
        if (next === "SL_HIT" && signal.order_id) {
          await broker.closeTrade(signal.order_id);

          await pool.query(
            `UPDATE signals SET order_id = NULL, opened_qty = 0 WHERE id = $1`,
            [signal.id]
          );
        }
      }

      // 4. Only update DB if something changed
      if (statusChanged || priceChanged) {
        await updateSignal(signal.id, next, price);
        if (statusChanged) await logEvent(signal.id, next, price);
      }
    } finally {
      await pool.query(`UPDATE signals SET processing = FALSE WHERE id = $1`, [
        signal.id,
      ]);
    }
  }
}
