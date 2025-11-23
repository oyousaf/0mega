import { pool } from "@/lib/neon";
import { getPrice } from "@/providers";

/** How much the price must change before we persist it */
const PRICE_THRESHOLD = 0.05;

/** Normalize engine enum -> pretty DB/UI label */
function toPretty(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

/** Core evaluation: decides ACTIVE / TP1 / TP2 / SL */
export function evaluateState(signal: any, price: number) {
  const entry = Number(signal.entry_price);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const sl = Number(signal.sl);

  if ([entry, tp1, tp2, sl].some((v) => isNaN(v))) {
    return "INVALID";
  }

  if (price >= tp2) return "TP2_HIT";
  if (price >= tp1) return "TP1_HIT";
  if (price <= sl) return "SL_HIT";

  return "ACTIVE";
}

/** Auto-expire logic */
export function isExpired(signal: any) {
  const created = new Date(signal.created_at);
  const now = new Date();
  return (now.getTime() - created.getTime()) / 86400000 >= 7;
}

/** Writes status + price back to DB */
async function updateSignalRow(id: number, status: string, price: number) {
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
    [toPretty(status), price, id]
  );
}

/** Logs major events (TP1, TP2, SL, EXPIRED, INVALID, ACTIVE) */
async function logEvent(id: number, event: string, price: number) {
  try {
    await pool.query(
      `
      INSERT INTO signal_history (signal_id, event, price, timestamp)
      VALUES ($1, $2, $3, NOW())
      `,
      [id, event.toUpperCase(), price]
    );
  } catch (err) {
    console.error("Failed to write signal_history:", err);
  }
}

/** MAIN ENGINE */
export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    const oldStatus = (signal.status || "ACTIVE").toUpperCase();
    const oldPrice = Number(signal.current_price ?? 0);

    // Get live price
    const price = await getPrice(signal.symbol, signal.type);

    // Determine new status
    let engineStatus = evaluateState(signal, price);

    if (isExpired(signal)) {
      engineStatus = "EXPIRED";
    }

    const prettyNew = toPretty(engineStatus);
    const statusChanged = prettyNew !== oldStatus;

    // Price changed enough to store?
    const priceChanged = Math.abs(price - oldPrice) >= PRICE_THRESHOLD;

    // If no change → skip entirely
    if (!statusChanged && !priceChanged) continue;

    // Persist new values
    await updateSignalRow(signal.id, engineStatus, price);

    // Only log when a major event actually happens
    if (statusChanged) {
      await logEvent(signal.id, prettyNew, price);
    }
  }
}
