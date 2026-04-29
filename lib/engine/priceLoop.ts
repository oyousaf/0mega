import { getPriceProvider } from "@/lib/prices/provider";
import type { Candle } from "@/types/trade";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";
import { executeTradeIntent } from "@/lib/trading/automation/executionHelpers";
import type { OrderSide } from "@/providers/execution/broker.interface";
import { SYMBOL_CONFIG } from "@/lib/trading/config/symbolConfig";

/* ---------------------------------------
ENGINE CONFIG
---------------------------------------- */

const ENGINE = {
  symbol: "EURUSD",
  timeframe: "1m",
  testMode: String(process.env.OMEGA_TEST_MODE).toLowerCase() === "true",

  rrTarget: 1.25,

  volWindow: 20,
  minVolPct: 0.00005,

  regimeWindow: 100,
  regimeMinPct: 0.00006,

  spikeMultiplier: 3,

  emaPeriod: 200,

  sessionStart: 7,
  sessionEnd: 22,

  maxSpreadPips: 1.5,

  rangeWindow: 15,
  minRangePct: 0.00025,

  activationWindow: 30,
  minActivationRangePips: 3,

  newsLookback: 5,
  newsSpikePips: 18,

  paperAccountEquity: 10000,
  riskPerTrade: 0.005,

  /**
   * API optimisation:
   * - no open trade -> fetch only every N minutes
   * - open trade    -> fetch every minute for exit monitoring
   */
  apiFetchEveryNMinutes: 2,

  engineLockKey: 999001,
  entryLockKey: 424242,

  automationCheckMs: 10000,
} as const;

/* ---------------------------------------
SYMBOL RUNTIME
---------------------------------------- */

const symbolCfg = SYMBOL_CONFIG[ENGINE.symbol];

if (!symbolCfg) {
  throw new Error(`[ENGINE] unsupported symbol ${ENGINE.symbol}`);
}

const RUNTIME = {
  pipSize: symbolCfg.pipSize,
  pipValuePerLot: symbolCfg.pipValuePerLot,
  minRequiredCandles: Math.max(
    ENGINE.emaPeriod + 1,
    ENGINE.regimeWindow,
    ENGINE.activationWindow,
    ENGINE.volWindow,
    ENGINE.rangeWindow,
    ENGINE.newsLookback,
    50,
  ),
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

function msUntilNextFetchBoundary() {
  const intervalMs = ENGINE.apiFetchEveryNMinutes * 60000;
  const now = Date.now();
  return intervalMs - (now % intervalMs) + 50;
}

function msUntilNextSessionOpen() {
  const now = new Date();
  const next = new Date(now);

  if (now.getUTCHours() < ENGINE.sessionStart) {
    next.setUTCHours(ENGINE.sessionStart, 0, 5, 0);
    return Math.max(1000, next.getTime() - now.getTime());
  }

  next.setUTCDate(now.getUTCDate() + 1);
  next.setUTCHours(ENGINE.sessionStart, 0, 5, 0);
  return Math.max(1000, next.getTime() - now.getTime());
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

function sessionOpen() {
  const hour = new Date().getUTCHours();
  return hour >= ENGINE.sessionStart && hour <= ENGINE.sessionEnd;
}

/* ---------------------------------------
WEEKEND GUARD
---------------------------------------- */

function isWeekend(): boolean {
  const day = new Date().getUTCDay();
  return day === 0 || day === 6;
}

function msUntilNextMondaySession(): number {
  const now = new Date();
  const next = new Date(now);

  const day = now.getUTCDay();

  if (day === 6) next.setUTCDate(now.getUTCDate() + 2);
  if (day === 0) next.setUTCDate(now.getUTCDate() + 1);

  next.setUTCHours(ENGINE.sessionStart, 0, 5, 0);

  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 7);
  }

  return Math.max(1000, next.getTime() - now.getTime());
}

function msUntilNextTradingDaySessionOpen() {
  const now = new Date();
  const next = new Date(now);

  next.setUTCDate(now.getUTCDate() + 1);
  next.setUTCHours(ENGINE.sessionStart, 0, 5, 0);

  return Math.max(1000, next.getTime() - now.getTime());
}

function rangePips(values: number[]) {
  return (Math.max(...values) - Math.min(...values)) / RUNTIME.pipSize;
}

function newsSpike(values: number[]) {
  const recent = values.slice(-ENGINE.newsLookback);

  return (
    (Math.max(...recent) - Math.min(...recent)) / RUNTIME.pipSize >=
    ENGINE.newsSpikePips
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

  return (candle.ask - candle.bid) / RUNTIME.pipSize;
}

function calculateLotSize(entry: number, stop: number) {
  const riskAmount = ENGINE.paperAccountEquity * ENGINE.riskPerTrade;
  const stopPips = Math.abs(entry - stop) / RUNTIME.pipSize;

  if (!(stopPips > 0)) return 0;

  const lots = riskAmount / (stopPips * RUNTIME.pipValuePerLot);
  return Number(lots.toFixed(3));
}

function fmt(n: number, dp = 5) {
  return Number.isFinite(n) ? Number(n.toFixed(dp)) : n;
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

async function hasOpenTrade(): Promise<boolean> {
  try {
    const { rows } = await pool.query(`
      SELECT 1
      FROM paper_trades
      WHERE is_closed = false
      LIMIT 1
    `);

    return rows.length > 0;
  } catch (err) {
    console.error("[OPEN_TRADE_CHECK_FAILED]", err);
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

  running = true;
  globalThis.__OMEGA_ENGINE_RUNNING__ = true;

  const loopId = nextLoopId();

  console.log("[ENGINE] started", {
    loopId,
    symbol: ENGINE.symbol,
    timeframe: ENGINE.timeframe,
  });

  const provider = getPriceProvider(ENGINE.symbol, ENGINE.timeframe);

  let lastCandleMinute: number | null = null;
  let lastFetchBucket: number | null = null;
  let lastAutomationCheck = Date.now();

  try {
    while (running && currentLoopId() === loopId) {
      try {
        /* ---------------- AUTOMATION HEARTBEAT ---------------- */

        if (Date.now() - lastAutomationCheck > ENGINE.automationCheckMs) {
          lastAutomationCheck = Date.now();

          if (!(await automationEnabled())) {
            console.log("[ENGINE] automation disabled");
            break;
          }
        }

        /* ---------------- WEEKEND PAUSE ---------------- */

        if (!ENGINE.testMode && isWeekend()) {
          const waitMs = msUntilNextMondaySession();

          console.log("[PAUSE] weekend", {
            waitMinutes: Math.ceil(waitMs / 60000),
          });

          await interruptibleSleep(waitMs, loopId);
          continue;
        }

        const openTrade = await hasOpenTrade();

        /* ---------------- SESSION PAUSE ---------------- */

        if (!ENGINE.testMode && !openTrade && !sessionOpen()) {
          const waitMs = msUntilNextSessionOpen();

          console.log("[PAUSE] session closed", {
            waitMinutes: Math.ceil(waitMs / 60000),
          });

          await interruptibleSleep(waitMs, loopId);
          continue;
        }

        /* ---------------- FETCH TIMING ---------------- */

        if (openTrade) {
          await interruptibleSleep(msUntilNextMinute(), loopId);
        } else {
          await interruptibleSleep(msUntilNextFetchBoundary(), loopId);
        }

        if (!running || currentLoopId() !== loopId) break;

        /* ---------------- FETCH BUCKET ---------------- */

        const now = Date.now();
        const bucket = openTrade ? minuteBucket(now) : fetchBucket(now);

        if (bucket === lastFetchBucket) continue;
        lastFetchBucket = bucket;

        /* ---------------- SAFE FETCH ---------------- */

        let candles: Candle[] = [];

        try {
          candles = await provider.fetchCandles();
        } catch (err) {
          console.error("[FETCH_FAILED]", err);
          await sleep(2000);
          continue;
        }

        if (!candles?.length || candles.length < RUNTIME.minRequiredCandles) {
          await sleep(2000);
          continue;
        }

        const latest = candles[candles.length - 1];
        const minute = minuteBucket(Number(latest.timestamp));

        if (minute === lastCandleMinute) continue;
        lastCandleMinute = minute;

        const price = Number(latest.close);
        if (!Number.isFinite(price)) continue;

        const spread = spreadPips(latest);

        console.log("[NEW_CANDLE]", {
          price: fmt(price),
          spread: spread ? fmt(spread, 2) : null,
          openTrade,
        });

        /* ---------------- EXIT CHECK ---------------- */

        const exited = await runExitWatcher(latest);
        if (exited) continue;

        /* ---------------- SPREAD FILTER ---------------- */

        if (
          !ENGINE.testMode &&
          spread !== null &&
          spread > ENGINE.maxSpreadPips
        ) {
          console.log("[SKIP] spread");
          continue;
        }

        /* ---------------- PREP DATA ---------------- */

        const closes = candles
          .map((c) => Number(c.close))
          .filter((v): v is number => Number.isFinite(v));

        if (closes.length < RUNTIME.minRequiredCandles) continue;

        /* ---------------- MARKET FILTERS ---------------- */

        if (!ENGINE.testMode) {
          if (
            rangePips(closes.slice(-ENGINE.activationWindow)) <
            ENGINE.minActivationRangePips
          ) {
            continue;
          }

          if (newsSpike(closes)) continue;

          if (
            avgAbsReturnPct(closes.slice(-ENGINE.regimeWindow)) <
            ENGINE.regimeMinPct
          )
            continue;

          if (
            avgAbsReturnPct(closes.slice(-ENGINE.volWindow)) < ENGINE.minVolPct
          )
            continue;
        }

        /* ---------------- TREND ---------------- */

        const emaNow = calculateEMA(closes, ENGINE.emaPeriod);
        const emaPrev = calculateEMA(closes.slice(0, -1), ENGINE.emaPeriod);

        if (!ENGINE.testMode && (!emaNow || !emaPrev)) continue;

        const emaSlope = (emaNow ?? 0) - (emaPrev ?? 0);

        /* ---------------- SIGNAL ---------------- */

        let signal = await runStructureCheck({
          symbol: ENGINE.symbol,
          timeframe: ENGINE.timeframe,
          candles,
        });

        if (!signal) continue;

        /* ---------------- TREND FILTER ---------------- */

        if (!ENGINE.testMode && emaNow !== null) {
          if (
            (signal.direction === "BUY" && (price < emaNow || emaSlope <= 0)) ||
            (signal.direction === "SELL" && (price > emaNow || emaSlope >= 0))
          ) {
            continue;
          }
        }

        /* ---------------- TRADE GEOMETRY ---------------- */

        const entry = price;
        const sl = Number(signal.sl);

        if (!Number.isFinite(sl)) continue;

        const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

        if (!(riskDist > 0)) continue;

        const tp1 =
          signal.direction === "BUY"
            ? entry + riskDist * ENGINE.rrTarget
            : entry - riskDist * ENGINE.rrTarget;

        /* ---------------- RISK GATE ---------------- */

        const risk = ENGINE.testMode
          ? { allowed: true as const }
          : await riskGate(signal);

        if (!risk.allowed) continue;

        const lotSize = calculateLotSize(entry, sl);
        if (!(lotSize > 0)) continue;

        /* ---------------- EXECUTION ---------------- */

        await withEntryLock(async () => {
          const { rows } = await pool.query(
            `SELECT 1 FROM paper_trades WHERE is_closed = false LIMIT 1`,
          );

          if (rows.length) return;

          const res = await executeTradeIntent({
            signalId: signal.reason,
            symbol: ENGINE.symbol,
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
