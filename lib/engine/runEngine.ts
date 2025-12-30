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
   BACKTEST BROKER REGISTRY
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
   ENGINE ENTRY
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
  const created = new Date(signal.created_at).getTime();
  const maxAge = 7 * 24 * 60 * 60 * 1000;

  if (now - created > maxAge) {
    await pool.query(`UPDATE signals SET status = 'EXPIRED' WHERE id = $1`, [
      signal.id,
    ]);
    return;
  }

  const price = await fetchPrice(signal.market, signal.symbol);
  if (price == null) {
    console.warn("[ENGINE][NO_PRICE]", signal.symbol, signal.market);
    return;
  }

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
   ORDER PLACEMENT
-------------------------------------------------- */
async function place(params: {
  market: "crypto" | "equity" | "forex";
  symbol: string;
  side: "BUY" | "SELL";
  qty?: number;
  slPips?: number;
  riskPct?: number;
}) {
  if (params.qty == null) {
    assertTradingAllowed(params.market, 0.02);
  }

  let qty = params.qty;

  if (params.market === "forex" && qty == null) {
    if (!params.slPips) throw new Error("FOREX_SL_PIPS_REQUIRED");

    const equity =
      engineMode() === "BACKTEST"
        ? (await getSimBroker("forex").fetchBalance())[0].total
        : (await brokerRouter.fetchBalance("forex"))[0].total;

    qty = computeForexPositionSize({
      equity,
      riskPct: params.riskPct ?? 0.01,
      slPips: params.slPips,
      pair: params.symbol,
    });
  }

  if (!qty || qty <= 0) throw new Error("INVALID_QTY");

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
   CLOSE / PARTIAL
-------------------------------------------------- */
async function closeSignal(signal: any, reason: string) {
  await place({
    market: signal.market,
    symbol: signal.symbol,
    side: signal.direction === "BUY" ? "SELL" : "BUY",
    qty: signal.qty,
  });

  const exitPrice = await fetchPrice(signal.market, signal.symbol);
  if (exitPrice != null) {
    const gross =
      signal.direction === "BUY"
        ? (exitPrice - signal.entry_price) * signal.qty
        : (signal.entry_price - exitPrice) * signal.qty;

    let fee = 0;
    if (engineMode() === "BACKTEST") {
      const execs = getSimBroker(signal.market).getExecutions();
      fee = execs.at(-1)?.fee ?? 0;
    }

    recordRealisedPnl(signal.market, gross - fee, 0.02);
  }

  await pool.query(
    `UPDATE signals SET status = 'CLOSED', close_reason = $2 WHERE id = $1`,
    [signal.id, reason]
  );
}

async function partialClose(signal: any, reason: string) {
  await place({
    market: signal.market,
    symbol: signal.symbol,
    side: signal.direction === "BUY" ? "SELL" : "BUY",
    qty: signal.qty * 0.5,
  });

  await pool.query(`UPDATE signals SET status = $2 WHERE id = $1`, [
    signal.id,
    reason,
  ]);
}

/* -------------------------------------------------
   PRICE SOURCE (FIXED)
-------------------------------------------------- */
async function fetchPrice(
  market: "crypto" | "equity" | "forex",
  symbol: string
): Promise<number | null> {
  if (engineMode() === "BACKTEST") {
    return getSimBroker(market).getPrice(symbol);
  }

  const mod = await import("@/providers");
  const asset = await import("@/lib/trading/detectAssetType");
  return mod.getPrice(symbol, asset.detectAsset(symbol));
}
