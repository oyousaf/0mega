import { pool } from "@/lib/neon";
import { getPrice } from "@/providers";

/** Minimum change before writing to DB */
const PRICE_THRESHOLD = 0.05;

/** Canonical → Pretty */
function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

/** PRIMARY STATE MACHINE (pre-finalisation) */
function evaluateState(signal: any, price: number): string {
  const entry = Number(signal.entry_price);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const sl = Number(signal.sl);

  if ([entry, tp1, tp2, sl].some((v) => isNaN(v))) {
    return signal.status?.toUpperCase().replace(/ /g, "_") || "ACTIVE";
  }

  const prev = signal.status?.toUpperCase().replace(/ /g, "_");

  // If already CLOSED, never reopen
  if (prev === "CLOSED") return "CLOSED";

  // If already hit a level, remains until finalisation
  if (["TP1_HIT", "TP2_HIT", "SL_HIT", "EXPIRED"].includes(prev)) return prev;

  // Live checks
  if (price >= tp2) return "TP2_HIT";
  if (price >= tp1) return "TP1_HIT";
  if (price <= sl) return "SL_HIT";

  return "ACTIVE";
}

/** After 7 days convert → EXPIRED (later resolves to CLOSED) */
function isExpired(signal: any) {
  const created = new Date(signal.created_at);
  const now = new Date();
  return (now.getTime() - created.getTime()) / 86400000 >= 7;
}

/** FINALISER (Option B)
    All hit states + expired become CLOSED */
function finaliseStatus(rawStatus: string, signal: any) {
  const s = rawStatus.toUpperCase();

  if (s === "TP1_HIT" || s === "TP2_HIT" || s === "SL_HIT" || s === "EXPIRED") {
    return "CLOSED";
  }

  // Active or unchanged
  return s;
}

/** Update DB */
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
    [formatStatus(status), price, id]
  );
}

/** Log status transitions */
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

/** MAIN ENGINE */
export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    if (signal.processing === true) continue;

    // Lock the row
    await pool.query(`UPDATE signals SET processing = TRUE WHERE id = $1`, [
      signal.id,
    ]);

    try {
      const oldPretty = signal.status?.toUpperCase() || "ACTIVE";
      const old = oldPretty.replace(/ /g, "_");

      const oldPrice = Number(signal.current_price ?? 0);
      const price = await getPrice(signal.symbol, signal.type);

      // ---------- 1. Calculate raw engine state ----------
      let rawState = evaluateState(signal, price);

      // ---------- 2. Add expiration ----------
      if (isExpired(signal)) rawState = "EXPIRED";

      // ---------- 3. Apply Option B finalisation ----------
      const finalState = finaliseStatus(rawState, signal);

      const statusChanged = finalState !== old;
      const priceChanged = Math.abs(price - oldPrice) >= PRICE_THRESHOLD;

      if (!statusChanged && !priceChanged) continue;

      // ---------- 4. Update DB ----------
      await updateSignalRow(signal.id, finalState, price);

      // ---------- 5. Log transitions only ----------
      if (statusChanged) {
        await logEvent(signal.id, finalState, price);
      }
    } finally {
      // Always unlock
      await pool.query(`UPDATE signals SET processing = FALSE WHERE id = $1`, [
        signal.id,
      ]);
    }
  }
}
