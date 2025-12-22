import { pool } from "@/lib/neon";
import { brokerRouter } from "@/lib/brokers";
import { engineNow, engineMode } from "./context";
import { SimulatedBrokerAdapter } from "@/lib/brokers/adapters/simulated.adapter";

/* -------------------------------------------------
   BACKTEST BROKER (singleton per process)
-------------------------------------------------- */
const simulatedBrokers: Record<string, SimulatedBrokerAdapter> = {};

function getSimBroker(market: "crypto" | "equity" | "forex") {
  if (!simulatedBrokers[market]) {
    simulatedBrokers[market] = new SimulatedBrokerAdapter(market);
  }
  return simulatedBrokers[market];
}

/* -------------------------------------------------
   CANONICAL ENGINE ENTRY
-------------------------------------------------- */
export async function runEngine() {
  const { rows: signals } = await pool.query(
    `
    SELECT *
    FROM signals
    WHERE status = 'ACTIVE'
    ORDER BY created_at ASC
    `
  );

  const now = engineNow();

  for (const signal of signals) {
    await processSignal(signal, now);
  }
}

/* -------------------------------------------------
   SIGNAL PROCESSING
-------------------------------------------------- */
async function processSignal(signal: any, now: number) {
  // Expiry logic
  const created = new Date(signal.created_at).getTime();
  const maxAge = 7 * 24 * 60 * 60 * 1000;

  if (now - created > maxAge) {
    await pool.query(`UPDATE signals SET status = 'EXPIRED' WHERE id = $1`, [
      signal.id,
    ]);
    return;
  }

  const price = await fetchPrice(signal.symbol);
  if (!price) return;

  if (signal.direction === "BUY") {
    if (price <= signal.sl) {
      await closeSignal(signal, "SL_HIT");
    } else if (signal.tp1 && price >= signal.tp1) {
      await partialClose(signal, "TP1_HIT");
    }
  } else {
    if (price >= signal.sl) {
      await closeSignal(signal, "SL_HIT");
    } else if (signal.tp1 && price <= signal.tp1) {
      await partialClose(signal, "TP1_HIT");
    }
  }
}

/* -------------------------------------------------
   EXECUTION HELPERS
-------------------------------------------------- */
async function place(params: {
  market: "crypto" | "equity" | "forex";
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
}) {
  if (engineMode() === "BACKTEST") {
    const sim = getSimBroker(params.market);
    return sim.placeOrder(params);
  }

  return brokerRouter.placeOrder(params);
}

async function closeSignal(signal: any, reason: string) {
  await place({
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

  await place({
    market: signal.market,
    symbol: signal.symbol,
    side: signal.direction === "BUY" ? "SELL" : "BUY",
    qty,
  });

  await pool.query(`UPDATE signals SET status = $2 WHERE id = $1`, [
    signal.id,
    reason,
  ]);
}

/* -------------------------------------------------
   PRICE FETCH
-------------------------------------------------- */
async function fetchPrice(symbol: string): Promise<number | null> {
  if (engineMode() === "BACKTEST") {
    // Price already injected into simulated broker
    return null;
  }

  const mod = await import("@/providers");
  const asset = await import("@/lib/trading/detectAssetType");
  const a = asset.detectAsset(symbol);
  return mod.getPrice(symbol, a);
}
