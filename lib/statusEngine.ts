import { pool } from "@/lib/neon";
import { fetchMockPrice } from "@/lib/prices";

/** How much price must change before writing to DB */
const PRICE_THRESHOLD = 0.05;

/** Convert engine enum → UI readable */
function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

/** Determine new status */
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

/** Expire after 7 days */
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
    SET status=$1,
        current_price=$2,
        updated_at=NOW()
    WHERE id=$3
    `,
    [formatStatus(newStatus), newPrice, id]
  );
}

/** Log major events */
async function logEvent(signalId: number, event: string, price: number) {
  try {
    await pool.query(
      `
      INSERT INTO signal_history (signal_id, event, price, timestamp)
      VALUES ($1, $2, $3, NOW())
      `,
      [signalId, event, price]
    );
  } catch (err) {
    console.error("Failed to log event:", err);
  }
}

/** Main engine */
export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    const oldStatus = signal.status;
    const oldPrice = Number(signal.current_price ?? 0);

    const price = await fetchMockPrice(signal.symbol);
    let newStatus = evaluateState(signal, price);

    // expiry check
    if (isExpired(signal)) newStatus = "EXPIRED";

    const pretty = formatStatus(newStatus);

    // ------------------------------------
    // CHANGE DETECTION
    // ------------------------------------

    const statusChanged = pretty !== oldStatus;
    const priceChanged =
      Math.abs(price - oldPrice) >= PRICE_THRESHOLD;

    // nothing changed → skip write
    if (!statusChanged && !priceChanged) continue;

    // write to DB
    await updateSignalRow(signal.id, newStatus, price);

    // only log meaningful status transitions
    if (statusChanged) {
      await logEvent(signal.id, pretty.toLowerCase(), price);
    }
  }
}
