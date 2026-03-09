import { getPriceProvider } from "@/lib/prices/provider";
import type { Candle } from "@/types/trade";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";
import { executeTradeIntent } from "@/lib/trading/automation/executionHelpers";

/* ---------------------------------------
CONFIG — FOREX FORWARD TEST
---------------------------------------- */

const SYMBOL = "EURUSD";
const TIMEFRAME = "1m";

const IDLE_POLL_MS = 2000;

const RR_TARGET = 1.25;

/* volatility filters */

const VOL_WINDOW = 20;
const MIN_VOL_PCT = 0.00015;

const REGIME_WINDOW = 100;
const REGIME_MIN_PCT = 0.00012;

const SPIKE_MULTIPLIER = 3;

const EMA_PERIOD = 200;

const SESSION_START = 7;
const SESSION_END = 22;

/* forex filters */

const MAX_SPREAD_PIPS = 1.5;

/* consolidation filter */

const RANGE_WINDOW = 15;
const MIN_RANGE_PCT = 0.00025;

/* london activation */

const ACTIVATION_WINDOW = 30;
const MIN_ACTIVATION_RANGE_PIPS = 8;

/* news guard */

const NEWS_LOOKBACK = 5;
const NEWS_SPIKE_PIPS = 18;

/* position sizing */

const PAPER_ACCOUNT_EQUITY = 10000;
const RISK_PER_TRADE = 0.005;

const PIP_SIZE = 0.0001;
const PIP_VALUE_PER_LOT = 10;

/* history requirement */

const MIN_REQUIRED_CANDLES = Math.max(
  EMA_PERIOD + 1,
  REGIME_WINDOW,
  ACTIVATION_WINDOW,
  VOL_WINDOW,
  RANGE_WINDOW,
  NEWS_LOOKBACK,
  50,
);

/* ---------------------------------------
LOOP CONTROL
---------------------------------------- */

let running = false;

declare global {
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

/* ---------------------------------------
HELPERS
---------------------------------------- */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMinuteBucket(timestampMs: number) {
  return Math.floor(timestampMs / 60000);
}

function avgAbsReturnPct(closes: number[]) {
  if (closes.length < 3) return 0;

  let sum = 0;
  let count = 0;

  for (let i = 1; i < closes.length; i++) {
    const a = closes[i - 1];
    const b = closes[i];

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

function sessionOpen() {
  const hour = new Date().getUTCHours();
  return hour >= SESSION_START && hour <= SESSION_END;
}

function calculateRangePips(values: number[]) {
  if (!values.length) return 0;
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (max - min) / PIP_SIZE;
}

function newsSpikeDetected(values: number[]) {
  const recent = values.slice(-NEWS_LOOKBACK);
  if (recent.length < NEWS_LOOKBACK) return false;

  const max = Math.max(...recent);
  const min = Math.min(...recent);

  const range = (max - min) / PIP_SIZE;

  return range >= NEWS_SPIKE_PIPS;
}

function calculateSpreadPips(candle: Candle) {
  if (
    typeof candle.bid !== "number" ||
    typeof candle.ask !== "number" ||
    !Number.isFinite(candle.bid) ||
    !Number.isFinite(candle.ask)
  ) {
    return null;
  }

  return (candle.ask - candle.bid) / PIP_SIZE;
}

function calculateLotSize(entry: number, stop: number) {
  const riskAmount = PAPER_ACCOUNT_EQUITY * RISK_PER_TRADE;
  const stopDistance = Math.abs(entry - stop);
  const stopPips = stopDistance / PIP_SIZE;

  if (!(stopPips > 0)) return 0;

  const lotSize = riskAmount / (stopPips * PIP_VALUE_PER_LOT);

  return Number(lotSize.toFixed(3));
}

/* ---------------------------------------
ENGINE
---------------------------------------- */

export async function startPriceLoop() {
  if (running) {
    console.log("[ENGINE] already running");
    return;
  }

  running = true;

  const loopId = nextLoopId();

  console.log("[ENGINE] started", {
    loopId,
    SYMBOL,
    TIMEFRAME,
  });

  const provider = getPriceProvider(SYMBOL, TIMEFRAME);

  /*
    We only evaluate once per completed/new candle minute.
    This keeps API usage sane for TwelveData free-tier limits.
  */
  let lastEvaluatedMinute: number | null = null;
  let lastNoCandleLogMinute: number | null = null;

  while (currentLoopId() === loopId) {
    try {
      const nowBucket = getMinuteBucket(Date.now());

      /*
        Only fetch once per new minute.
        This is the big anti-rate-limit fix.
      */
      if (lastEvaluatedMinute === nowBucket) {
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const candles: Candle[] = await provider.fetchCandles();

      if (!candles || candles.length === 0) {
        if (lastNoCandleLogMinute !== nowBucket) {
          console.log("[ENGINE] provider returned no candles");
          lastNoCandleLogMinute = nowBucket;
        }
        await sleep(IDLE_POLL_MS);
        continue;
      }

      if (candles.length < MIN_REQUIRED_CANDLES) {
        console.log("[ENGINE] waiting for enough candles", {
          have: candles.length,
          need: MIN_REQUIRED_CANDLES,
        });
        lastEvaluatedMinute = nowBucket;
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const latest = candles[candles.length - 1];
      const latestBucket = getMinuteBucket(Number(latest.timestamp));

      /*
        Avoid evaluating the exact same candle twice,
        even if provider data lags or loop jitters.
      */
      if (lastEvaluatedMinute === latestBucket) {
        await sleep(IDLE_POLL_MS);
        continue;
      }

      lastEvaluatedMinute = latestBucket;

      const price = Number(latest.close);

      if (!Number.isFinite(price)) {
        console.log("[ENGINE] invalid latest close", latest);
        await sleep(IDLE_POLL_MS);
        continue;
      }

      /*
        Run exit watcher once per new candle.
        In paper mode this is acceptable and avoids extra provider hits.
      */
      await runExitWatcher(price);

      if (!sessionOpen()) {
        console.log("[SKIP] session closed");
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const spreadPips = calculateSpreadPips(latest);

      if (spreadPips !== null && spreadPips > MAX_SPREAD_PIPS) {
        console.log("[SKIP] spread too wide", spreadPips);
        await sleep(IDLE_POLL_MS);
        continue;
      }

      console.log("[CANDLE]", price);

      const closes = candles
        .map((c) => Number(c.close))
        .filter((n) => Number.isFinite(n));

      if (closes.length < MIN_REQUIRED_CANDLES) {
        console.log("[SKIP] insufficient close history", closes.length);
        await sleep(IDLE_POLL_MS);
        continue;
      }

      /* london activation */

      const activationCloses = closes.slice(-ACTIVATION_WINDOW);
      const rangePips = calculateRangePips(activationCloses);

      if (rangePips < MIN_ACTIVATION_RANGE_PIPS) {
        console.log("[SKIP] london range not active", rangePips);
        await sleep(IDLE_POLL_MS);
        continue;
      }

      /* news guard */

      if (newsSpikeDetected(closes)) {
        console.log("[SKIP] news volatility spike");
        await sleep(IDLE_POLL_MS);
        continue;
      }

      /* volatility regime */

      const regimeCloses = closes.slice(-REGIME_WINDOW);
      const regimeVol = avgAbsReturnPct(regimeCloses);

      if (regimeVol < REGIME_MIN_PCT) {
        console.log("[SKIP] low volatility regime");
        await sleep(IDLE_POLL_MS);
        continue;
      }

      /* short volatility */

      const shortCloses = closes.slice(-VOL_WINDOW);
      const vol = avgAbsReturnPct(shortCloses);

      if (vol < MIN_VOL_PCT) {
        console.log("[SKIP] short volatility too low");
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const prevClose = closes[closes.length - 2];
      const lastClose = closes[closes.length - 1];

      const lastMove = Math.abs(lastClose - prevClose) / prevClose;

      if (lastMove > vol * SPIKE_MULTIPLIER) {
        console.log("[SKIP] volatility spike");
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const rangeCloses = closes.slice(-RANGE_WINDOW);
      const rangePct =
        (Math.max(...rangeCloses) - Math.min(...rangeCloses)) /
        Math.min(...rangeCloses);

      if (rangePct < MIN_RANGE_PCT) {
        console.log("[SKIP] tight consolidation");
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const emaNow = calculateEMA(closes, EMA_PERIOD);
      const emaPrev = calculateEMA(closes.slice(0, -1), EMA_PERIOD);

      if (emaNow === null || emaPrev === null) {
        console.log("[SKIP] ema unavailable");
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const emaSlope = emaNow - emaPrev;

      const signal = await runStructureCheck({
        symbol: SYMBOL,
        timeframe: TIMEFRAME,
        candles,
      });

      if (!signal) {
        await sleep(IDLE_POLL_MS);
        continue;
      }

      if (signal.direction === "BUY") {
        if (price < emaNow) {
          console.log("[SKIP] buy below ema");
          await sleep(IDLE_POLL_MS);
          continue;
        }
        if (emaSlope <= 0) {
          console.log("[SKIP] buy ema slope not positive");
          await sleep(IDLE_POLL_MS);
          continue;
        }
      }

      if (signal.direction === "SELL") {
        if (price > emaNow) {
          console.log("[SKIP] sell above ema");
          await sleep(IDLE_POLL_MS);
          continue;
        }
        if (emaSlope >= 0) {
          console.log("[SKIP] sell ema slope not negative");
          await sleep(IDLE_POLL_MS);
          continue;
        }
      }

      const entry = price;
      const sl = Number(signal.sl);

      if (!Number.isFinite(entry) || !Number.isFinite(sl)) {
        console.log("[SKIP] invalid entry/sl", { entry, sl });
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

      if (!(riskDist > entry * 0.00005)) {
        console.log("[SKIP] risk distance too small");
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const tp1 =
        signal.direction === "BUY"
          ? entry + riskDist * RR_TARGET
          : entry - riskDist * RR_TARGET;

      const risk = await riskGate(signal, entry);

      if (!risk.allowed) {
        console.log("[ENTRY_BLOCKED]", risk.reason);
        await sleep(IDLE_POLL_MS);
        continue;
      }

      const lotSize = calculateLotSize(entry, sl);

      if (!(lotSize > 0)) {
        console.log("[SKIP] invalid lot size", lotSize);
        await sleep(IDLE_POLL_MS);
        continue;
      }

      await withDbLock(async () => {
        const { rows } = await pool.query(
          `SELECT 1 FROM paper_trades WHERE is_closed = false LIMIT 1`,
        );

        if (rows.length) {
          console.log("[SKIP] open trade already exists");
          return;
        }

        const res = await executeTradeIntent({
          signalId: signal.reason,
          symbol: SYMBOL,
          qty: lotSize,
          side: signal.direction,
          rawSl: sl,
          rawTp1: tp1,
          entryPrice: entry,
        });

        if (res.success) {
          console.log("[TRADE_OPENED]", {
            tradeId: res.tradeId,
            side: signal.direction,
            entry,
            sl,
            tp1,
            lotSize,
          });
        } else {
          console.log("[TRADE_FAILED]", res);
        }
      });
    } catch (err) {
      console.error("[ENGINE_ERROR]", err);
      await sleep(IDLE_POLL_MS);
    }
  }

  running = false;
  console.log("[ENGINE] stopped");
}

/* ---------------------------------------
STOP ENGINE
---------------------------------------- */

export function stopPriceLoop() {
  nextLoopId();
  running = false;
  console.log("[ENGINE] stop requested");
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
