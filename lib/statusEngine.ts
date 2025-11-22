import { pool } from "@/lib/neon";
import { getPrice } from "@/providers";

/** Minimum change before writing to DB */
const PRICE_THRESHOLD = 0.05;

/** Convert ENGINE_STATUS → readable UI status */
function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

/** Evaluate new status based on TP/SL/Entry logic */
export function evaluateState(signal: any, price: number) {
  const entry = Number(signal.entry_price);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const sl = Number(signal.sl);

  // Invalid data → skip evaluation
  if ([entry, tp1, tp2, sl].some((v) => isNaN(v))) return "INVALID";

  if (price >= tp2) return "TP2_HIT";
  if (price >= tp1) return "TP1_HIT";
  if (price <= sl) return "SL_HIT";

  return "ACTIVE";
}

/** Auto expire older than 7 days */
export function isExpired(signal: any) {
  const created = new Date(signal.created_at);
  const now = new Date();
  return (now.getTime() - created.getTime()) / 86400000 >= 7;
}

/** Update DB safely */
async function updateSignalRow(
  id: number,
  newStatus: string,
  newPrice: number
) {
  await pool.query(
    `
    UPDATE signals
    SET status = $1,
        current_price = $2,
        updated_at = NOW()
    WHERE id = $3
    `,
    [formatStatus(newStatus), newPrice, id]
  );
}

/** Log meaningful transitions into signal_history */
async function logEvent(signalId: number, event: string, price: number) {
  try {
    await pool.query(
      `
      INSERT INTO signal_history (signal_id, event, price, timestamp)
      VALUES ($1, $2, $3, NOW())
      `,
      [signalId, event.toUpperCase(), price]
    );
  } catch (err) {
    console.error("Failed to log event:", err);
  }
}

/**
 * MAIN ENGINE
 * Called from runEngineAction in Active Signals.
 */
export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    const oldStatus = signal.status?.toUpperCase() || "ACTIVE";
    const oldPrice = Number(signal.current_price ?? 0);

    // Fetch new price using providers
    const currentPrice = await getPrice(signal.symbol, signal.type);

    // Determine updated state
    let engineStatus = evaluateState(signal, currentPrice);

    // Expiry check
    if (isExpired(signal)) engineStatus = "EXPIRED";

    // Format for DB/UI
    const prettyStatus = formatStatus(engineStatus);

    // Compare to avoid unnecessary DB writes
    const statusChanged =
      prettyStatus.toUpperCase() !== oldStatus.toUpperCase();
    const priceChanged = Math.abs(currentPrice - oldPrice) >= PRICE_THRESHOLD;

    // NOTHING CHANGED → SKIP
    if (!statusChanged && !priceChanged) continue;

    // Write updated row
    await updateSignalRow(signal.id, engineStatus, currentPrice);

    // Log only meaningful status transitions
    if (statusChanged) {
      await logEvent(signal.id, engineStatus, currentPrice);
    }
  }
}
