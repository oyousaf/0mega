import { getPriceProvider } from "@/lib/prices/provider";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { getBroker } from "@/providers/execution/router";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";

type PriceLoopConfig = {
  symbol: string;
  timeframe: "1m" | "5m" | "15m";
  pollMs: number;
};

const DEFAULT_CONFIG: PriceLoopConfig = {
  symbol: "BTCUSDT",
  timeframe: "5m",
  pollMs: 5000,
};

/* -----------------------------
   COOLDOWN CONFIG
------------------------------ */
const COOLDOWN_CANDLES = 5;
let cooldownUntilTs: number | null = null;

declare global {
  // eslint-disable-next-line no-var
  var __OMEGA_27_LOOP_ID__: number | undefined;
}

function nextLoopId() {
  const id = (globalThis.__OMEGA_27_LOOP_ID__ ?? 0) + 1;
  globalThis.__OMEGA_27_LOOP_ID__ = id;
  return id;
}

function currentLoopId() {
  return globalThis.__OMEGA_27_LOOP_ID__ ?? 0;
}

let lastCandleTs: number | null = null;

export async function startPriceLoop(config: Partial<PriceLoopConfig> = {}) {
  const loopId = nextLoopId();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  console.log("[PRICE_LOOP] started", cfg, "loopId=", loopId);

  while (currentLoopId() === loopId) {
    const started = Date.now();

    try {
      await tick(cfg, loopId);
    } catch (err) {
      console.error("[PRICE_LOOP] tick error", err);
    }

    const sleep = Math.max(cfg.pollMs - (Date.now() - started), 0);
    await delay(sleep);
  }

  console.log("[PRICE_LOOP] exited cleanly", "loopId=", loopId);
}

export function stopPriceLoop() {
  nextLoopId();
  console.log("[PRICE_LOOP] stop requested");
}

async function tick(cfg: PriceLoopConfig, loopId: number) {
  if (currentLoopId() !== loopId) return;

  const provider = getPriceProvider(cfg.symbol, cfg.timeframe);
  const candles = await provider.fetchCandles();
  if (!candles.length) return;

  if (currentLoopId() !== loopId) return;

  const latest = candles[candles.length - 1];

  if (lastCandleTs === latest.timestamp) return;
  lastCandleTs = latest.timestamp;

  console.log("[PRICE_LOOP] new candle", {
    ts: latest.timestamp,
    close: latest.close,
  });

  /* -----------------------------
     EXIT WATCHER (ALWAYS RUNS)
  ------------------------------ */
  const exited = await runExitWatcher(latest.close);

  if (exited) {
    cooldownUntilTs = latest.timestamp + COOLDOWN_CANDLES * cfg.pollMs;

    console.log(
      "[COOLDOWN] started until",
      new Date(cooldownUntilTs).toISOString()
    );
  }

  /* -----------------------------
     COOLDOWN ENFORCEMENT
  ------------------------------ */
  if (cooldownUntilTs && latest.timestamp < cooldownUntilTs) {
    console.log("[COOLDOWN] active, skipping entry");
    return;
  }

  /* -----------------------------
     ENTRY LOGIC
  ------------------------------ */
  const signal = await runStructureCheck({
    symbol: cfg.symbol,
    timeframe: cfg.timeframe,
    candles,
  });

  if (!signal) {
    console.log("[PRICE_LOOP] no structure");
    return;
  }

  console.log("[STRUCTURE_SIGNAL]", signal);

  const risk = await riskGate(signal, latest.close);
  if (!risk.allowed) {
    console.warn("[RISK_BLOCK]", risk.reason);
    return;
  }

  await withDbLock(async () => {
    if (currentLoopId() !== loopId) return;

    const { rows } = await pool.query(`SELECT 1 FROM paper_trades LIMIT 1`);

    if (rows.length) {
      console.log("[PRICE_LOOP] trade already active");
      return;
    }

    const broker = getBroker();

    const res = await broker.placeOrder(signal.symbol, 1, signal.direction);

    await pool.query(
      `
      UPDATE paper_trades
      SET sl = $1, tp1 = $2
      WHERE id = $3
      `,
      [signal.sl, signal.tp1 ?? null, res.orderId]
    );

    console.log("[PRICE_LOOP] trade opened", {
      id: res.orderId,
      side: signal.direction,
      sl: signal.sl,
      tp1: signal.tp1 ?? null,
    });
  });
}

async function withDbLock(fn: () => Promise<void>) {
  await pool.query("BEGIN");
  try {
    await pool.query("SELECT pg_advisory_xact_lock(424242)");
    await fn();
    await pool.query("COMMIT");
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
