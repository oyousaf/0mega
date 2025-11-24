import { pool } from "@/lib/neon";
import { getPrice } from "@/providers";

/** Minimum change before writing to DB */
const PRICE_THRESHOLD = 0.05;

/** Convert ENGINE_STATUS */
function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

/** Evaluate new status based on TP/SL logic */
export function evaluateState(signal: any, price: number) {
  const entry = Number(signal.entry_price);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const sl = Number(signal.sl);

  if ([entry, tp1, tp2, sl].some((v) => isNaN(v))) return "INVALID";

  if (price >= tp2) return "TP2_HIT";
  if (price >= tp1) return "TP1_HIT";
  if (price <= sl) return "SL_HIT";

  return "ACTIVE";
}

/** Auto expire after 7 days */
export function isExpired(signal: any) {
  const created = new Date(signal.created_at);
  const now = new Date();
  return (now.getTime() - created.getTime()) / 86400000 >= 7;
}

/** Update DB */
async function updateSignalRow(
  id: number,
  newStatus: string,
  newPrice: number
) {
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
    [formatStatus(newStatus), newPrice, id]
  );
}

/** Log meaningful transitions */
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

/** MAIN ENGINE — NOW WITH PROCESSING LOCK */
export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    // ---------------------------------------------------
    // 1. Skip signals already locked
    // ---------------------------------------------------
    if (signal.processing === true) continue;

    // ---------------------------------------------------
    // 2. Lock this signal
    // ---------------------------------------------------
    await pool.query(`UPDATE signals SET processing = TRUE WHERE id = $1`, [
      signal.id,
    ]);

    try {
      const oldStatus = signal.status?.toUpperCase() || "ACTIVE";
      const oldPrice = Number(signal.current_price ?? 0);

      const currentPrice = await getPrice(signal.symbol, signal.type);
      let engineStatus = evaluateState(signal, currentPrice);

      // Expiration check
      if (isExpired(signal)) engineStatus = "EXPIRED";

      const prettyStatus = formatStatus(engineStatus);

      const statusChanged =
        prettyStatus.toUpperCase() !== oldStatus.toUpperCase();
      const priceChanged = Math.abs(currentPrice - oldPrice) >= PRICE_THRESHOLD;

      // No change? skip
      if (!statusChanged && !priceChanged) continue;

      // Apply update
      await updateSignalRow(signal.id, engineStatus, currentPrice);

      // Log event only when status changed
      if (statusChanged) {
        await logEvent(signal.id, engineStatus, currentPrice);
      }
    } finally {
      // ---------------------------------------------------
      // 3. Always unlock, even if an error was thrown
      // ---------------------------------------------------
      await pool.query(`UPDATE signals SET processing = FALSE WHERE id = $1`, [
        signal.id,
      ]);
    }
  }
}
