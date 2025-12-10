import { pool } from "@/lib/neon";
import { getPrice } from "@/providers";

import {
  prettyStatus,
  canonicalStatus,
  AllowedStatus,
} from "@/lib/signal/status";

const PRICE_THRESHOLD = 0.05;

/* -----------------------------------------------------
   PRICE STATE LOGIC
----------------------------------------------------- */
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

/* -----------------------------------------------------
   EXPIRATION LOGIC
----------------------------------------------------- */
function isExpired(signal: any): boolean {
  const created = new Date(signal.created_at).getTime();
  const now = Date.now();
  return (now - created) / 86400000 >= 7;
}

/* -----------------------------------------------------
   FINAL STATE AFTER HITS
----------------------------------------------------- */
function applyFinalisation(raw: string): string {
  const s = raw.toUpperCase();
  return ["TP1_HIT", "TP2_HIT", "SL_HIT", "EXPIRED"].includes(s)
    ? "CLOSED"
    : s;
}

/* -----------------------------------------------------
   PERSIST TO DB
----------------------------------------------------- */
async function updateSignalRow(id: number, canonical: string, price: number) {
  const pretty = canonical.replace(/_/g, " ");

  await pool.query(
    `
    UPDATE signals
    SET 
      status = $1,
      current_price = $2,
      updated_at = CASE 
        WHEN status != $1 THEN NOW()
        ELSE updated_at
      END
    WHERE id = $3
    `,
    [pretty, price, id]
  );
}

async function logEvent(signalId: number, canonical: string, price: number) {
  try {
    await pool.query(
      `
        INSERT INTO signal_history (signal_id, event, price, timestamp)
        VALUES ($1, $2, $3, NOW())
      `,
      [signalId, canonical.toUpperCase(), price]
    );
  } catch {}
}

/* -----------------------------------------------------
   MAIN ENGINE
----------------------------------------------------- */
export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    if (signal.processing) continue;

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

      const final = applyFinalisation(raw);

      const statusChanged = final !== prev;
      const priceChanged = Math.abs(price - oldPrice) >= PRICE_THRESHOLD;

      if (!statusChanged && !priceChanged) continue;

      await updateSignalRow(signal.id, final, price);

      if (statusChanged) {
        await logEvent(signal.id, final, price);
      }
    } finally {
      await pool.query(`UPDATE signals SET processing = FALSE WHERE id = $1`, [
        signal.id,
      ]);
    }
  }
}
