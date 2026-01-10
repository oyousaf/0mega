import { getPriceProvider } from "@/lib/prices/provider";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";
import { executeTradeIntent } from "@/lib/trading/automation/executionHelpers";

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

const COOLDOWN_CANDLES = 1;

/* ---------------------------------------
   LOOP CONTROL
---------------------------------------- */
declare global {
  // eslint-disable-next-line no-var
  var __OMEGA_PRICE_LOOP_ID__: number | undefined;
}

function nextLoopId() {
  const id = (globalThis.__OMEGA_PRICE_LOOP_ID__ ?? 0) + 1;
  globalThis.__OMEGA_PRICE_LOOP_ID__ = id;
  return id;
}

function currentLoopId() {
  return globalThis.__OMEGA_PRICE_LOOP_ID__ ?? 0;
}

let lastCandleTs: number | null = null;
let cooldownUntilTs: number | null = null;

/* ---------------------------------------
   PUBLIC API
---------------------------------------- */
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
    await new Promise((r) => setTimeout(r, sleep));
  }
}

export function stopPriceLoop() {
  nextLoopId();
  console.log("[PRICE_LOOP] stop requested");
}

/* ---------------------------------------
   CORE TICK
---------------------------------------- */
async function tick(cfg: PriceLoopConfig, loopId: number) {
  if (currentLoopId() !== loopId) return;

  const provider = getPriceProvider(cfg.symbol, cfg.timeframe);
  const candles = await provider.fetchCandles();
  if (!candles.length) return;

  const latest = candles[candles.length - 1];
  if (lastCandleTs === latest.timestamp) return;
  lastCandleTs = latest.timestamp;

  console.log("[PRICE_LOOP] new candle", {
    ts: latest.timestamp,
    close: latest.close,
  });

  /* ---------- EXIT ---------- */
  const exited = await runExitWatcher(latest.close);
  if (exited) {
    cooldownUntilTs = latest.timestamp + COOLDOWN_CANDLES * cfg.pollMs;
    return;
  }

  if (cooldownUntilTs && latest.timestamp < cooldownUntilTs) {
    return;
  }

  /* ---------- STRUCTURE ---------- */
  const signal = await runStructureCheck({
    symbol: cfg.symbol,
    timeframe: cfg.timeframe,
    candles,
  });

  if (!signal) return;

  const entry = latest.close;
  const sl = signal.sl;

  // Direction-safe risk
  const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

  if (!Number.isFinite(riskDist) || riskDist <= entry * 0.0003) {
    console.warn("[SKIP] invalid risk distance", { entry, sl });
    return;
  }

  const tp1 = signal.direction === "BUY" ? entry + riskDist : entry - riskDist;

  const risk = await riskGate(signal, entry);
  if (!risk.allowed) return;

  await withDbLock(async () => {
    if (currentLoopId() !== loopId) return;

    const { rows } = await pool.query(
      `SELECT 1 FROM paper_trades WHERE is_closed = false LIMIT 1`
    );
    if (rows.length) return;

    const openRes = await executeTradeIntent({
      signalId: signal.reason,
      symbol: signal.symbol,
      qty: 1,
      side: signal.direction,
      rawSl: sl,
      rawTp1: tp1,
      entryPrice: entry,
    });

    if (!openRes.success) {
      console.warn("[ENTRY_FAILED]", openRes.error);
      return;
    }

    console.log("[TRADE_OPENED]", {
      side: signal.direction,
      entry,
      sl,
      tp1,
    });
  });
}

/* ---------------------------------------
   DB LOCK
---------------------------------------- */
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
