import { getPriceProvider } from "@/lib/prices/provider";
import type { Candle } from "@/types/trade";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";
import { executeTradeIntent } from "@/lib/trading/automation/executionHelpers";
import type { OrderSide } from "@/providers/execution/broker.interface";
import {
  ACTIVE_SYMBOLS,
  SYMBOL_CONFIG,
  type SymbolConfig,
} from "@/lib/trading/config/symbolConfig";

/* ---------------------------------------
ENGINE CONFIG
---------------------------------------- */

const ENGINE = {
  testMode: String(process.env.OMEGA_TEST_MODE).toLowerCase() === "true",

  spikeMultiplier: 3,

  paperAccountEquity: 10000,

  riskPerTrade: 0.005,

  apiFetchEveryNMinutes: 2,

  engineLockKey: 999001,

  entryLockKey: 424242,

  automationCheckMs: 10000,

  heartbeatMs: 60_000,
} as const;

/* ---------------------------------------
ENGINE STATE
---------------------------------------- */

let running = false;

declare global {
  // eslint-disable-next-line no-var
  var __OMEGA_PRICE_LOOP_ID__: number | undefined;
  // eslint-disable-next-line no-var
  var __OMEGA_ENGINE_RUNNING__: boolean | undefined;
}

function nextLoopId() {
  const id = (globalThis.__OMEGA_PRICE_LOOP_ID__ ?? 0) + 1;
  globalThis.__OMEGA_PRICE_LOOP_ID__ = id;
  return id;
}

function currentLoopId() {
  return globalThis.__OMEGA_PRICE_LOOP_ID__ ?? 0;
}

/* ---------------------------------------
TYPES
---------------------------------------- */

type SymbolRuntime = {
  config: SymbolConfig;
  provider: ReturnType<typeof getPriceProvider>;
  lastCandleMinute: number | null;
  lastFetchBucket: number | null;
  lastSessionClosedLog: number | null;
};

type RuntimeMap = Map<string, SymbolRuntime>;

/* ---------------------------------------
UTILS
---------------------------------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function interruptibleSleep(ms: number, loopId: number) {
  const step = 1000;
  let waited = 0;

  while (running && currentLoopId() === loopId && waited < ms) {
    const remaining = ms - waited;
    const chunk = Math.min(step, remaining);
    await sleep(chunk);
    waited += chunk;
  }
}

function msUntilNextMinute() {
  const now = Date.now();
  return 60000 - (now % 60000) + 50;
}

function minuteBucket(ts: number) {
  return Math.floor(ts / 60000);
}

function fetchBucket(ts: number) {
  const intervalMs = ENGINE.apiFetchEveryNMinutes * 60000;
  return Math.floor(ts / intervalMs);
}

function avgAbsReturnPct(values: number[]) {
  let sum = 0;
  let count = 0;

  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1];
    const b = values[i];

    if (a > 0 && Number.isFinite(a) && Number.isFinite(b)) {
      sum += Math.abs(b - a) / a;
      count++;
    }
  }

  return count ? sum / count : 0;
}

function calculateEMA(values: number[], period: number) {
  if (values.length < period) return null;

  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }

  return ema;
}

function sessionOpen(config: SymbolConfig) {
  const hour = new Date().getUTCHours();

  return hour >= config.sessionStartUtc && hour < config.sessionEndUtc;
}

/* ---------------------------------------
WEEKEND GUARD
---------------------------------------- */

function isWeekend(): boolean {
  const day = new Date().getUTCDay();
  return day === 0 || day === 6;
}

function rangePips(values: number[], config: SymbolConfig) {
  return (Math.max(...values) - Math.min(...values)) / config.pipSize;
}

function newsSpike(values: number[], config: SymbolConfig) {
  const recent = values.slice(-config.newsLookback);

  return (
    (Math.max(...recent) - Math.min(...recent)) / config.pipSize >=
    config.newsSpikePips
  );
}

function spreadPips(candle: Candle, config: SymbolConfig) {
  if (
    typeof candle.bid !== "number" ||
    typeof candle.ask !== "number" ||
    !Number.isFinite(candle.bid) ||
    !Number.isFinite(candle.ask)
  ) {
    return null;
  }

  return (candle.ask - candle.bid) / config.pipSize;
}

function calculateLotSize(entry: number, stop: number, config: SymbolConfig) {
  const riskAmount = ENGINE.paperAccountEquity * ENGINE.riskPerTrade;
  const stopPips = Math.abs(entry - stop) / config.pipSize;

  if (!(stopPips > 0)) return 0;

  const lots = riskAmount / (stopPips * config.pipValuePerLot);
  return Number(lots.toFixed(3));
}

function fmt(n: number, dp = 5) {
  return Number.isFinite(n) ? Number(n.toFixed(dp)) : n;
}

function minRequiredCandles(config: SymbolConfig) {
  return Math.max(
    config.emaPeriod + 1,
    config.regimeWindow,
    config.activationWindow,
    config.volWindow,
    config.rangeWindow,
    config.newsLookback,
    80,
  );
}

function buildRuntime(): RuntimeMap {
  const runtime: RuntimeMap = new Map();

  for (const symbol of ACTIVE_SYMBOLS) {
    const config = SYMBOL_CONFIG[symbol];

    if (!config) {
      throw new Error(`[ENGINE] unsupported symbol: ${symbol}`);
    }

    runtime.set(config.symbol, {
      config,
      provider: getPriceProvider(config.symbol, config.timeframe),
      lastCandleMinute: null,
      lastFetchBucket: null,
      lastSessionClosedLog: null,
    });
  }

  return runtime;
}

/* ---------------------------------------
ENGINE LOCK
---------------------------------------- */

async function acquireEngineLock() {
  const { rows } = await pool.query(
    `SELECT pg_try_advisory_lock($1) AS locked`,
    [ENGINE.engineLockKey],
  );

  return Boolean(rows[0]?.locked);
}

async function releaseEngineLock() {
  try {
    await pool.query(`SELECT pg_advisory_unlock($1)`, [ENGINE.engineLockKey]);
  } catch (err) {
    console.error("[ENGINE_UNLOCK_FAILED]", err);
  }
}

/* ---------------------------------------
AUTOMATION CHECK
---------------------------------------- */

async function automationEnabled(): Promise<boolean> {
  try {
    const { rows } = await pool.query(`
      SELECT enabled
      FROM automation_state
      LIMIT 1
    `);

    return Boolean(rows[0]?.enabled);
  } catch (err) {
    console.error("[AUTOMATION_CHECK_FAILED]", err);
    return false;
  }
}

/* ---------------------------------------
TRADE STATE
---------------------------------------- */

async function hasOpenTrade(symbol: string): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      `
      SELECT 1
      FROM paper_trades
      WHERE symbol = $1
      AND is_closed = false
      LIMIT 1
      `,
      [symbol],
    );

    return rows.length > 0;
  } catch (err) {
    console.error("[OPEN_TRADE_CHECK_FAILED]", { symbol, err });
    return false;
  }
}

/* ---------------------------------------
ENTRY LOCK
Serialises the open-trade check + execution block
across concurrent loop attempts.
---------------------------------------- */

async function withEntryLock<T>(fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query(`SELECT pg_advisory_lock($1)`, [ENGINE.entryLockKey]);
    return await fn();
  } finally {
    try {
      await client.query(`SELECT pg_advisory_unlock($1)`, [
        ENGINE.entryLockKey,
      ]);
    } catch (err) {
      console.error("[ENTRY_UNLOCK_FAILED]", err);
    }

    client.release();
  }
}

/* ---------------------------------------
SYMBOL PROCESSOR
---------------------------------------- */

async function processSymbol(runtime: SymbolRuntime, loopId: number) {
  const { config, provider } = runtime;
  const symbol = config.symbol;

  if (!running || currentLoopId() !== loopId) return;

  const openTrade = await hasOpenTrade(symbol);

  if (!ENGINE.testMode && isWeekend()) {
    return;
  }

  if (!ENGINE.testMode && !openTrade && !sessionOpen(config)) {
    const nowBucket = Math.floor(Date.now() / 300000);

    if (runtime.lastSessionClosedLog !== nowBucket) {
      runtime.lastSessionClosedLog = nowBucket;

      console.log("[SKIP] session closed", {
        SYMBOL: symbol,
        SESSION_START_UTC: config.sessionStartUtc,
        SESSION_END_UTC: config.sessionEndUtc,
      });
    }

    return;
  }

  const now = Date.now();
  const currentFetchBucket = openTrade ? minuteBucket(now) : fetchBucket(now);

  if (currentFetchBucket === runtime.lastFetchBucket) {
    return;
  }

  runtime.lastFetchBucket = currentFetchBucket;

  let candles: Candle[] = [];

  try {
    candles = await provider.fetchCandles();
  } catch (err) {
    console.error("[FETCH_FAILED]", {
      SYMBOL: symbol,
      err,
    });
    return;
  }

  if (!candles?.length) {
    console.log("[SKIP] no candles returned", {
      SYMBOL: symbol,
    });
    return;
  }

  const requiredCandles = minRequiredCandles(config);

  if (candles.length < requiredCandles) {
    console.log("[SKIP] insufficient candles", {
      SYMBOL: symbol,
      received: candles.length,
      required: requiredCandles,
    });
    return;
  }

  const latestRaw = candles[candles.length - 1];

  const latest = {
    ...latestRaw,
    symbol,
  } as Candle;

  const minute = minuteBucket(Number(latest.timestamp));

  if (minute === runtime.lastCandleMinute) return;
  runtime.lastCandleMinute = minute;

  const price = Number(latest.close);
  const spread = spreadPips(latest, config);

  console.log("[NEW_CANDLE]", {
    SYMBOL: symbol,
    TIMEFRAME: config.timeframe,
    CLOSE: fmt(price),
    SPREAD_PIPS: spread === null ? null : fmt(spread, 2),
    OPEN_TRADE: openTrade,
  });

  if (!Number.isFinite(price)) {
    console.log("[SKIP] invalid candle price", {
      SYMBOL: symbol,
    });
    return;
  }

  const exited = await runExitWatcher(latest);
  if (exited) return;

  if (!ENGINE.testMode && spread !== null && spread > config.maxSpreadPips) {
    console.log("[SKIP] spread too wide", {
      SYMBOL: symbol,
      spreadPips: fmt(spread, 2),
      maxSpreadPips: config.maxSpreadPips,
    });
    return;
  }

  const closes = candles
    .map((c) => Number(c.close))
    .filter((v): v is number => Number.isFinite(v));

  if (closes.length < requiredCandles) {
    console.log("[SKIP] insufficient valid closes", {
      SYMBOL: symbol,
    });
    return;
  }

  if (!ENGINE.testMode) {
    const activationRange = rangePips(
      closes.slice(-config.activationWindow),
      config,
    );

    if (activationRange < config.minActivationRangePips) {
      console.log("[SKIP] activation range not active", {
        SYMBOL: symbol,
        activationRangePips: fmt(activationRange, 2),
        requiredPips: config.minActivationRangePips,
      });
      return;
    }

    if (newsSpike(closes, config)) {
      console.log("[SKIP] news spike", {
        SYMBOL: symbol,
      });
      return;
    }

    const regimeVol = avgAbsReturnPct(closes.slice(-config.regimeWindow));

    if (regimeVol < config.regimeMinPct) {
      console.log("[SKIP] low volatility regime", {
        SYMBOL: symbol,
        regimeVol,
        required: config.regimeMinPct,
      });
      return;
    }

    const vol = avgAbsReturnPct(closes.slice(-config.volWindow));

    if (vol < config.minVolPct) {
      console.log("[SKIP] short volatility too low", {
        SYMBOL: symbol,
        vol,
        required: config.minVolPct,
      });
      return;
    }

    const prev = closes[closes.length - 2];
    const last = closes[closes.length - 1];
    const move = Math.abs(last - prev) / prev;

    if (move > vol * ENGINE.spikeMultiplier) {
      console.log("[SKIP] volatility spike", {
        SYMBOL: symbol,
        move,
        threshold: vol * ENGINE.spikeMultiplier,
      });
      return;
    }

    const rangeValues = closes.slice(-config.rangeWindow);
    const rangePct =
      (Math.max(...rangeValues) - Math.min(...rangeValues)) /
      Math.min(...rangeValues);

    if (rangePct < config.minRangePct) {
      console.log("[SKIP] tight consolidation", {
        SYMBOL: symbol,
        rangePct,
        required: config.minRangePct,
      });
      return;
    }
  }

  const emaNow = calculateEMA(closes, config.emaPeriod);
  const emaPrev = calculateEMA(closes.slice(0, -1), config.emaPeriod);

  if (!ENGINE.testMode && (!emaNow || !emaPrev)) {
    console.log("[SKIP] ema unavailable", {
      SYMBOL: symbol,
    });
    return;
  }

  const emaSlope = (emaNow ?? 0) - (emaPrev ?? 0);

  let signal = await runStructureCheck({
    symbol,
    timeframe: config.timeframe,
    candles,
  });

  if (ENGINE.testMode && !signal) {
    const dist = config.pipSize * 5;

    signal = {
      symbol,
      direction: "BUY" as OrderSide,
      sl: price - dist,
      tp1: price + dist,
      reason: "TEST_SIGNAL",
    };

    console.log("[TEST_MODE] forced signal", {
      SYMBOL: symbol,
    });
  }

  if (!signal) {
    console.log("[SKIP] no structure signal", {
      SYMBOL: symbol,
    });
    return;
  }

  if (!ENGINE.testMode && emaNow !== null) {
    if (signal.direction === "BUY" && (price < emaNow || emaSlope <= 0)) {
      console.log("[SKIP] buy trend filter", {
        SYMBOL: symbol,
        SIGNAL_REASON: signal.reason,
      });
      return;
    }

    if (signal.direction === "SELL" && (price > emaNow || emaSlope >= 0)) {
      console.log("[SKIP] sell trend filter", {
        SYMBOL: symbol,
        SIGNAL_REASON: signal.reason,
      });
      return;
    }
  }

  const entry = price;
  const sl = Number(signal.sl);

  if (!Number.isFinite(sl)) {
    console.log("[SKIP] invalid stop loss", {
      SYMBOL: symbol,
    });
    return;
  }

  const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

  if (!(riskDist > 0)) {
    console.log("[SKIP] invalid risk distance", {
      SYMBOL: symbol,
      side: signal.direction,
      entry: fmt(entry),
      sl: fmt(sl),
    });
    return;
  }

  const tp1 =
    signal.direction === "BUY"
      ? entry + riskDist * config.rrTarget
      : entry - riskDist * config.rrTarget;

  const risk = ENGINE.testMode
    ? { allowed: true as const }
    : await riskGate(signal);

  if (!risk.allowed) {
    console.log("[ENTRY_BLOCKED]", {
      SYMBOL: symbol,
      reason: risk.reason,
    });
    return;
  }

  const lotSize = calculateLotSize(entry, sl, config);

  if (!(lotSize > 0)) {
    console.log("[SKIP] lot size invalid", {
      SYMBOL: symbol,
    });
    return;
  }

  await withEntryLock(async () => {
    const { rows } = await pool.query(
      `
      SELECT 1
      FROM paper_trades
      WHERE symbol = $1
      AND is_closed = false
      LIMIT 1
      `,
      [symbol],
    );

    if (rows.length) {
      console.log("[SKIP] open trade already exists for symbol", {
        SYMBOL: symbol,
      });
      return;
    }

    const res = await executeTradeIntent({
      signalId: signal.reason,
      symbol,
      qty: lotSize,
      side: signal.direction,
      rawSl: sl,
      rawTp1: tp1,
      entryPrice: entry,
    });

    if (res.success) {
      const riskPips = Math.abs(entry - sl) / config.pipSize;

      console.log("[TRADE_OPENED]", {
        TRADE_ID: res.tradeId,
        SYMBOL: symbol,
        SIDE: signal.direction,
        SIGNAL_REASON: signal.reason,
        ENTRY_PRICE: fmt(entry),
        SL: fmt(sl),
        TP1: fmt(tp1),
        LOT_SIZE: lotSize,
        RISK_PIPS: fmt(riskPips, 2),
        RR_TARGET: config.rrTarget,
      });
    } else {
      console.log("[TRADE_FAILED]", {
        SYMBOL: symbol,
        result: res,
      });
    }
  });
}

/* ---------------------------------------
ENGINE
---------------------------------------- */

export async function startPriceLoop() {
  if (running) {
    console.log("[ENGINE] already running");
    return;
  }

  const locked = await acquireEngineLock();

  if (!locked) {
    console.log("[ENGINE] another instance already running");
    return;
  }

  if (!(await automationEnabled())) {
    console.log("[ENGINE] automation disabled");
    await releaseEngineLock();
    return;
  }

  const runtime = buildRuntime();

  running = true;
  globalThis.__OMEGA_ENGINE_RUNNING__ = true;

  const loopId = nextLoopId();

  console.log("[ENGINE] started", {
    loopId,
    symbols: [...runtime.keys()],
    testMode: ENGINE.testMode,
    apiFetchEveryNMinutes: ENGINE.apiFetchEveryNMinutes,
  });

  let lastAutomationCheck = Date.now();
  let lastHeartbeat = Date.now();

  try {
    while (running && currentLoopId() === loopId) {
      try {
        const nowMs = Date.now();

        if (nowMs - lastHeartbeat >= ENGINE.heartbeatMs) {
          lastHeartbeat = nowMs;

          console.log("[ENGINE_HEARTBEAT]", {
            loopId,
            running,
            symbols: [...runtime.keys()],
            time: new Date().toISOString(),
          });
        }

        if (nowMs - lastAutomationCheck > ENGINE.automationCheckMs) {
          lastAutomationCheck = nowMs;

          if (!(await automationEnabled())) {
            console.log("[ENGINE] automation disabled");
            break;
          }
        }

        if (!ENGINE.testMode && isWeekend()) {
          console.log("[PAUSE] weekend market closed");

          await interruptibleSleep(msUntilNextMinute(), loopId);

          continue;
        }

        for (const symbolRuntime of runtime.values()) {
          if (!running || currentLoopId() !== loopId) break;

          await processSymbol(symbolRuntime, loopId);
        }

        await interruptibleSleep(msUntilNextMinute(), loopId);
      } catch (err) {
        console.error("[ENGINE_LOOP_ERROR]", err);
        await sleep(2000);
      }
    }
  } finally {
    running = false;
    globalThis.__OMEGA_ENGINE_RUNNING__ = false;

    await releaseEngineLock();

    console.log("[ENGINE] stopped");
  }
}

/* ---------------------------------------
STOP ENGINE
---------------------------------------- */

export function stopPriceLoop() {
  nextLoopId();
  running = false;
  globalThis.__OMEGA_ENGINE_RUNNING__ = false;

  console.log("[ENGINE] stop requested");
}
