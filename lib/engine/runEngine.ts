import { pool } from "@/lib/neon";
import { brokerRouter } from "@/lib/brokers";
import { engineNow, engineMode } from "./context";
import { SimulatedBrokerAdapter } from "@/lib/brokers/adapters/simulated.adapter";

import {
  computeStopLossPrice,
  computeTakeProfitPrice,
  validateForexLevels,
} from "@/lib/engine/risk/forexLevels";

import { computeForexPositionSize } from "@/lib/engine/risk/forexPositionSizing";

import {
  assertTradingAllowed,
  recordRealisedPnl,
} from "@/lib/engine/risk/dailyRisk";

/* -------------------------------------------------
   BACKTEST BROKER (singleton per process)
-------------------------------------------------- */
const simulatedBrokers: Record<
  "crypto" | "equity" | "forex",
  SimulatedBrokerAdapter
> = {} as any;

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
  const { rows: signals } = await pool.query(`
    SELECT *
    FROM signals
    WHERE status = 'ACTIVE'
    ORDER BY created_at ASC
  `);

  const now = engineNow();

  for (const signal of signals) {
    await processSignal(signal, now);
  }
}

/* -------------------------------------------------
   SIGNAL PROCESSING
-------------------------------------------------- */
async function processSignal(signal: any, now: number) {
  // Expiry
  const created = new Date(signal.created_at).getTime();
  const maxAge = 7 * 24 * 60 * 60 * 1000;

  if (now - created > maxAge) {
    await pool.query(`UPDATE signals SET status = 'EXPIRED' WHERE id = $1`, [
      signal.id,
    ]);
    return;
  }

  // Price
  const price = await fetchPrice(signal.symbol);
  if (price == null) return;

  // Resolve SL / TP
  let sl = signal.sl;
  let tp1 = signal.tp1 ?? null;

  if (signal.market === "forex") {
    sl = computeStopLossPrice({
      pair: signal.symbol,
      entryPrice: signal.entry_price,
      slPips: signal.sl,
      side: signal.direction,
    });

    if (signal.tp1) {
      tp1 = computeTakeProfitPrice({
        pair: signal.symbol,
        entryPrice: signal.entry_price,
        tpPips: signal.tp1,
        side: signal.direction,
      });
    }

    validateForexLevels({
      entry: signal.entry_price,
      sl,
      tp: tp1 ?? undefined,
      side: signal.direction,
    });
  }

  // Comparison
  if (signal.direction === "BUY") {
    if (price <= sl) {
      await closeSignal(signal, "SL_HIT");
    } else if (tp1 && price >= tp1) {
      await partialClose(signal, "TP1_HIT");
    }
  } else {
    if (price >= sl) {
      await closeSignal(signal, "SL_HIT");
    } else if (tp1 && price <= tp1) {
      await partialClose(signal, "TP1_HIT");
    }
  }
}

/* -------------------------------------------------
   EXECUTION HELPER
-------------------------------------------------- */
async function place(params: {
  market: "crypto" | "equity" | "forex";
  symbol: string;
  side: "BUY" | "SELL";
  qty?: number;
  slPips?: number;
  riskPct?: number;
}) {
  // DAILY LOSS GUARD (before opening trades)
  if (params.qty == null) {
    assertTradingAllowed(params.market, 0.02); // 2% daily loss cap
  }

  let qty = params.qty;

  // FOREX OPEN → risk sizing
  if (params.market === "forex" && qty == null) {
    if (!params.slPips) {
      throw new Error("FOREX_SL_PIPS_REQUIRED");
    }

    let equity: number;

    if (engineMode() === "BACKTEST") {
      const sim = getSimBroker("forex");
      const balance = await sim.fetchBalance();
      equity = balance[0].total;
    } else {
      const balance = await brokerRouter.fetchBalance("forex");
      equity = balance[0].total;
    }

    qty = computeForexPositionSize({
      equity,
      riskPct: params.riskPct ?? 0.01,
      slPips: params.slPips,
      pair: params.symbol,
    });
  }

  if (!qty || qty <= 0) {
    throw new Error("INVALID_QTY");
  }

  if (engineMode() === "BACKTEST") {
    return getSimBroker(params.market).placeOrder({
      symbol: params.symbol,
      side: params.side,
      qty,
      market: params.market,
    });
  }

  return brokerRouter.placeOrder({
    symbol: params.symbol,
    side: params.side,
    qty,
    market: params.market,
  });
}

/* -------------------------------------------------
   CLOSE HELPERS
-------------------------------------------------- */
async function closeSignal(signal: any, reason: string) {
  await place({
    market: signal.market,
    symbol: signal.symbol,
    side: signal.direction === "BUY" ? "SELL" : "BUY",
    qty: signal.qty,
  });

  // Realised PnL (fees included)
  const exitPrice = await fetchPrice(signal.symbol);
  if (exitPrice != null) {
    const grossPnl =
      signal.direction === "BUY"
        ? (exitPrice - signal.entry_price) * signal.qty
        : (signal.entry_price - exitPrice) * signal.qty;

    let fee = 0;

    if (engineMode() === "BACKTEST") {
      const execs = getSimBroker(signal.market).getExecutions();
      const last = execs[execs.length - 1];
      fee = last?.fee ?? 0;
    }

    recordRealisedPnl(signal.market, grossPnl - fee, 0.02);
  }

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
    return null; // injected into simulated broker
  }

  const mod = await import("@/providers");
  const asset = await import("@/lib/trading/detectAssetType");
  const a = asset.detectAsset(symbol);

  return mod.getPrice(symbol, a);
}
