import { pool } from "@/lib/neon";
import { brokerRouter } from "@/lib/brokers";
import { engineNow } from "./context";

/**
 * Canonical engine entry.
 * Used by LIVE and BACKTEST.
 */
export async function runEngine() {
  // Fetch active signals
  const { rows: signals } = await pool.query(
    `
    SELECT *
    FROM signals
    WHERE status = 'ACTIVE'
    ORDER BY created_at ASC
    `
  );

  const now = engineNow();

  for (const s of signals) {
    await processSignal(s, now);
  }
}

/* -------------------------------------------------
   Signal processing
-------------------------------------------------- */
async function processSignal(signal: any, now: number) {
  // Expiry example (7 days)
  const created = new Date(signal.created_at).getTime();
  const maxAge = 7 * 24 * 60 * 60 * 1000;

  if (now - created > maxAge) {
    await pool.query(
      `UPDATE signals SET status = 'EXPIRED' WHERE id = $1`,
      [signal.id]
    );
    return;
  }

  // Fetch price (existing provider)
  const price = await fetchPrice(signal.symbol, signal.market);
  if (!price) return;

  // TP / SL logic (simplified)
  if (signal.direction === "BUY") {
    if (price <= signal.sl) {
      await closeSignal(signal, "SL_HIT");
    }
    if (signal.tp1 && price >= signal.tp1) {
      await partialClose(signal, "TP1_HIT");
    }
  } else {
    if (price >= signal.sl) {
      await closeSignal(signal, "SL_HIT");
    }
    if (signal.tp1 && price <= signal.tp1) {
      await partialClose(signal, "TP1_HIT");
    }
  }
}

/* -------------------------------------------------
   Execution helpers
-------------------------------------------------- */
async function closeSignal(signal: any, reason: string) {
  await brokerRouter.placeOrder({
    market: signal.market,
    symbol: signal.symbol,
    side: signal.direction === "BUY" ? "SELL" : "BUY",
    qty: signal.qty,
  });

  await pool.query(
    `UPDATE signals SET status = 'CLOSED', close_reason = $2 WHERE id = $1`,
    [signal.id, reason]
  );
}

async function partialClose(signal: any, reason: string) {
  const qty = signal.qty * 0.5;

  await brokerRouter.placeOrder({
    market: signal.market,
    symbol: signal.symbol,
    side: signal.direction === "BUY" ? "SELL" : "BUY",
    qty,
  });

  await pool.query(
    `UPDATE signals SET status = $2 WHERE id = $1`,
    [signal.id, reason]
  );
}

/* -------------------------------------------------
   Price hook
-------------------------------------------------- */
async function fetchPrice(symbol: string, market: string): Promise<number | null> {
  // Use your existing provider
  const mod = await import("@/providers");
  const asset = await import("@/lib/trading/detectAssetType");
  const a = asset.detectAsset(symbol);
  return mod.getPrice(symbol, a);
}
