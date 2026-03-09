import { getPriceProvider } from "@/lib/prices/provider";
import type { Candle } from "@/types/trade";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";
import { executeTradeIntent } from "@/lib/trading/automation/executionHelpers";

/* ---------------------------------------
CONFIG
---------------------------------------- */

const SYMBOL = "EURUSD";
const TIMEFRAME = "1m";

const IDLE_POLL_MS = 2000;

const TEST_MODE = process.env.OMEGA_TEST_MODE === "true";

const RR_TARGET = 1.25;

/* volatility */

const VOL_WINDOW = 20;
const MIN_VOL_PCT = 0.00005;

const REGIME_WINDOW = 100;
const REGIME_MIN_PCT = 0.00006;

const SPIKE_MULTIPLIER = 3;

/* trend */

const EMA_PERIOD = 200;

/* session */

const SESSION_START = 7;
const SESSION_END = 22;

/* forex */

const MAX_SPREAD_PIPS = 1.5;

/* consolidation */

const RANGE_WINDOW = 15;
const MIN_RANGE_PCT = 0.00025;

/* london activation */

const ACTIVATION_WINDOW = 30;
const MIN_ACTIVATION_RANGE_PIPS = 3;

/* news guard */

const NEWS_LOOKBACK = 5;
const NEWS_SPIKE_PIPS = 18;

/* risk */

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

/* engine lock */

const ENGINE_LOCK_KEY = 999001;

/* ---------------------------------------
ENGINE STATE
---------------------------------------- */

let running = false;

declare global {
  var __OMEGA_PRICE_LOOP_ID__: number | undefined;
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
UTILS
---------------------------------------- */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const minuteBucket = (ts: number) => Math.floor(ts / 60000);

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

function sessionOpen() {
  const hour = new Date().getUTCHours();
  return hour >= SESSION_START && hour <= SESSION_END;
}

function rangePips(values: number[]) {
  return (Math.max(...values) - Math.min(...values)) / PIP_SIZE;
}

function newsSpike(values: number[]) {
  const recent = values.slice(-NEWS_LOOKBACK);
  return (
    (Math.max(...recent) - Math.min(...recent)) / PIP_SIZE >= NEWS_SPIKE_PIPS
  );
}

function spreadPips(candle: Candle) {
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
  const stopPips = Math.abs(entry - stop) / PIP_SIZE;

  if (!(stopPips > 0)) return 0;

  const lots = riskAmount / (stopPips * PIP_VALUE_PER_LOT);
  return Number(lots.toFixed(3));
}

async function acquireEngineLock() {
  const { rows } = await pool.query(
    `SELECT pg_try_advisory_lock($1) AS locked`,
    [ENGINE_LOCK_KEY],
  );

  return Boolean(rows[0]?.locked);
}

async function releaseEngineLock() {
  try {
    await pool.query(`SELECT pg_advisory_unlock($1)`, [ENGINE_LOCK_KEY]);
  } catch (err) {
    console.error("[ENGINE_UNLOCK_FAILED]", err);
  }
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

  running = true;
  globalThis.__OMEGA_ENGINE_RUNNING__ = true;

  const loopId = nextLoopId();

  console.log("[ENGINE] started", {
    loopId,
    symbol: SYMBOL,
    timeframe: TIMEFRAME,
    testMode: TEST_MODE,
  });

  const provider = getPriceProvider(SYMBOL, TIMEFRAME);

  let lastMinute: number | null = null;

  try {
    while (running && currentLoopId() === loopId) {
      try {
        const candles: Candle[] = await provider.fetchCandles();

        if (!candles?.length) {
          await sleep(IDLE_POLL_MS);
          continue;
        }

        if (candles.length < MIN_REQUIRED_CANDLES) {
          await sleep(IDLE_POLL_MS);
          continue;
        }

        const latest = candles[candles.length - 1];
        const minute = minuteBucket(Number(latest.timestamp));

        if (minute === lastMinute) {
          await sleep(IDLE_POLL_MS);
          continue;
        }

        lastMinute = minute;

        const price = Number(latest.close);
        if (!Number.isFinite(price)) continue;

        console.log("[CANDLE]", price);

        const exited = await runExitWatcher(latest);

        if (exited) {
          console.log("[ENGINE] trade exited this candle");
          continue;
        }

        if (!TEST_MODE && !sessionOpen()) {
          console.log("[SKIP] session closed");
          continue;
        }

        const spread = spreadPips(latest);

        if (!TEST_MODE && spread !== null && spread > MAX_SPREAD_PIPS) {
          console.log("[SKIP] spread too wide", spread);
          continue;
        }

        const closes = candles
          .map((c) => Number(c.close))
          .filter((v): v is number => Number.isFinite(v));

        if (!TEST_MODE) {
          const activationRange = rangePips(closes.slice(-ACTIVATION_WINDOW));

          if (activationRange < MIN_ACTIVATION_RANGE_PIPS) {
            console.log("[SKIP] london range not active");
            continue;
          }

          if (newsSpike(closes)) {
            console.log("[SKIP] news spike");
            continue;
          }

          const regimeVol = avgAbsReturnPct(closes.slice(-REGIME_WINDOW));

          if (regimeVol < REGIME_MIN_PCT) {
            console.log("[SKIP] low volatility regime");
            continue;
          }

          const vol = avgAbsReturnPct(closes.slice(-VOL_WINDOW));

          if (vol < MIN_VOL_PCT) {
            console.log("[SKIP] short volatility too low");
            continue;
          }

          const prev = closes[closes.length - 2];
          const last = closes[closes.length - 1];
          const move = Math.abs(last - prev) / prev;

          if (move > vol * SPIKE_MULTIPLIER) {
            console.log("[SKIP] volatility spike");
            continue;
          }

          const rangeValues = closes.slice(-RANGE_WINDOW);
          const rangePct =
            (Math.max(...rangeValues) - Math.min(...rangeValues)) /
            Math.min(...rangeValues);

          if (rangePct < MIN_RANGE_PCT) {
            console.log("[SKIP] tight consolidation");
            continue;
          }
        }

        const emaNow = calculateEMA(closes, EMA_PERIOD);
        const emaPrev = calculateEMA(closes.slice(0, -1), EMA_PERIOD);

        if (!TEST_MODE && (!emaNow || !emaPrev)) continue;

        const emaSlope = (emaNow ?? 0) - (emaPrev ?? 0);

        let signal = await runStructureCheck({
          symbol: SYMBOL,
          timeframe: TIMEFRAME,
          candles,
        });

        if (TEST_MODE && !signal) {
          const dist = PIP_SIZE * 5;

          signal = {
            symbol: SYMBOL,
            direction: "BUY",
            sl: price - dist,
            tp1: price + dist,
            reason: "TEST_SIGNAL",
          };

          console.log("[TEST_MODE] forced signal");
        }

        if (!signal) continue;

        if (!TEST_MODE && emaNow !== null) {
          if (signal.direction === "BUY") {
            if (price < emaNow || emaSlope <= 0) {
              console.log("[SKIP] buy trend filter");
              continue;
            }
          }

          if (signal.direction === "SELL") {
            if (price > emaNow || emaSlope >= 0) {
              console.log("[SKIP] sell trend filter");
              continue;
            }
          }
        }

        const entry = price;
        const sl = Number(signal.sl);

        if (!Number.isFinite(sl)) {
          console.log("[SKIP] invalid stop loss");
          continue;
        }

        const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

        if (!(riskDist > 0)) {
          console.log("[SKIP] invalid risk distance");
          continue;
        }

        const tp1 =
          signal.direction === "BUY"
            ? entry + riskDist * RR_TARGET
            : entry - riskDist * RR_TARGET;

        const risk = TEST_MODE
          ? { allowed: true as const }
          : await riskGate(signal);

        if (!risk.allowed) {
          console.log("[ENTRY_BLOCKED]", risk.reason);
          continue;
        }

        const lotSize = calculateLotSize(entry, sl);

        if (!(lotSize > 0)) {
          console.log("[SKIP] lot size invalid");
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
            console.log("[TRADE_OPENED]", res.tradeId);
          } else {
            console.log("[TRADE_FAILED]", res);
          }
        });
      } catch (err) {
        console.error("[ENGINE_ERROR]", err);
        await sleep(IDLE_POLL_MS);
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
