import { pool } from "@/lib/neon";
import { getPrice } from "@/providers";

import {
  prettyStatus,
  canonicalStatus,
  isClosedStatus,
  AllowedStatus,
} from "@/lib/signal/status";

/** Minimum change before writing to DB */
const PRICE_THRESHOLD = 0.05;

/* -----------------------------------------------------
   PRIMARY STATE MACHINE (pre-finalisation)
   Determines what the signal *should* be based on price.
   Output is canonical snake_case.
----------------------------------------------------- */
function evaluateState(signal: any, price: number): string {
  const entry = Number(signal.entry_price);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const sl = Number(signal.sl);

  const prevPretty = prettyStatus(signal.status);
  const prev = canonicalStatus(prevPretty);

  // Already fully closed → never reopen
  if (prev === "CLOSED") return "CLOSED";

  // Missing fields → fallback to previous safe state
  if ([entry, tp1, tp2, sl].some((v) => isNaN(v))) {
    return prev;
  }

  // Already hit something → hold it until closed
  if (isClosedStatus(prevPretty) && prev !== "CLOSED") {
    return prev;
  }

  // Live checks → canonical snake_case
  if (price >= tp2) return "TP2_HIT";
  if (price >= tp1) return "TP1_HIT";
  if (price <= sl) return "SL_HIT";

  return "ACTIVE";
}

/* -----------------------------------------------------
   Expiration Handler (7 days)
   Returns canonical "EXPIRED" if needed.
----------------------------------------------------- */
function isExpired(signal: any): boolean {
  const created = new Date(signal.created_at);
  const now = new Date();
  return (now.getTime() - created.getTime()) / 86400000 >= 7;
}

/* -----------------------------------------------------
   FINALISER
   ANY resolved hit state ⇒ CLOSED
   EXPIRED ⇒ CLOSED
----------------------------------------------------- */
function applyFinalisation(raw: string): string {
  const s = raw.toUpperCase();

  if (s === "TP1_HIT" || s === "TP2_HIT" || s === "SL_HIT" || s === "EXPIRED") {
    return "CLOSED";
  }

  return s;
}

/* -----------------------------------------------------
   DB WRITE HELPERS
----------------------------------------------------- */
async function updateSignalRow(id: number, canonical: string, price: number) {
  // Store pretty version in DB for readability
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
  } catch (err) {
    console.error("Failed to log event:", err);
  }
}

/* -----------------------------------------------------
   MAIN ENGINE
----------------------------------------------------- */
export async function runStatusEngine(signals: any[]) {
  for (const signal of signals) {
    if (signal.processing === true) continue;

    // Lock
    await pool.query(`UPDATE signals SET processing = TRUE WHERE id = $1`, [
      signal.id,
    ]);

    try {
      const prevPretty: AllowedStatus = prettyStatus(signal.status);
      const prev = canonicalStatus(prevPretty);

      const oldPrice = Number(signal.current_price ?? 0);

      // Fetch new price
      const price = await getPrice(signal.symbol, signal.type);

      // ------- 1. Pre-finalisation evaluation -------
      let raw = evaluateState(signal, price);

      // ------- 2. Expiration -------
      if (isExpired(signal)) raw = "EXPIRED";

      // ------- 3. Finalisation -------
      const final = applyFinalisation(raw);

      const statusChanged = final !== prev;
      const priceChanged = Math.abs(price - oldPrice) >= PRICE_THRESHOLD;

      if (!statusChanged && !priceChanged) continue;

      // ------- 4. DB Update -------
      await updateSignalRow(signal.id, final, price);

      // ------- 5. Log only transitions -------
      if (statusChanged) {
        await logEvent(signal.id, final, price);
      }
    } finally {
      // Unlock
      await pool.query(`UPDATE signals SET processing = FALSE WHERE id = $1`, [
        signal.id,
      ]);
    }
  }
}
