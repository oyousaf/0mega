import { getPriceProvider } from "@/lib/prices/provider";
import type { Candle } from "@/types/trade";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";
import { executeTradeIntent } from "@/lib/trading/automation/executionHelpers";
import type { OrderSide } from "@/providers/execution/broker.interface";

/* ---------------------------------------
CONFIG
---------------------------------------- */

const SYMBOL = "EURUSD";
const TIMEFRAME = "1m";

const TEST_MODE = String(process.env.OMEGA_TEST_MODE).toLowerCase() === "true";

const RR_TARGET = 1.25;

const VOL_WINDOW = 20;
const MIN_VOL_PCT = 0.00005;

const REGIME_WINDOW = 100;
const REGIME_MIN_PCT = 0.00006;

const SPIKE_MULTIPLIER = 3;

const EMA_PERIOD = 200;

const SESSION_START = 7;
const SESSION_END = 22;

const MAX_SPREAD_PIPS = 1.5;

const RANGE_WINDOW = 15;
const MIN_RANGE_PCT = 0.00025;

const ACTIVATION_WINDOW = 30;
const MIN_ACTIVATION_RANGE_PIPS = 3;

const NEWS_LOOKBACK = 5;
const NEWS_SPIKE_PIPS = 18;

const PAPER_ACCOUNT_EQUITY = 10000;
const RISK_PER_TRADE = 0.005;

const ENTRY_COOLDOWN_MINUTES = 10;
const MAX_CONSECUTIVE_LOSSES = 3;

const PIP_SIZE = 0.0001;
const PIP_VALUE_PER_LOT = 10;

const ENGINE_LOCK_KEY = 999001;
const ENTRY_LOCK_KEY = 424242;

const MIN_REQUIRED_CANDLES = Math.max(
  EMA_PERIOD + 1,
  REGIME_WINDOW,
  ACTIVATION_WINDOW,
  VOL_WINDOW,
  RANGE_WINDOW,
  NEWS_LOOKBACK,
  50,
);

const AUTOMATION_CHECK_MS = 10000;

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function msUntilNextMinute() {
  const now = Date.now();
  return 60000 - (now % 60000) + 50;
}

function minuteBucket(ts: number) {
  return Math.floor(ts / 60000);
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

function fmt(n: number, dp = 5) {
  return Number.isFinite(n) ? Number(n.toFixed(dp)) : n;
}

/* ---------------------------------------
ENGINE LOCK
---------------------------------------- */

async function acquireEngineLock() {
  const { rows } = await pool.query(
    `SELECT pg_try_advisory_lock($1) AS locked`,
    [ENGINE_LOCK_KEY],
  );

  return Boolean(rows[0]?.locked);
}

async function releaseEngineLock() {
  await pool.query(`SELECT pg_advisory_unlock($1)`, [ENGINE_LOCK_KEY]);
}

/* ---------------------------------------
AUTOMATION CHECK
---------------------------------------- */

async function automationEnabled(): Promise<boolean> {
  const { rows } = await pool.query(`
      SELECT enabled
      FROM automation_state
      LIMIT 1
  `);

  return Boolean(rows[0]?.enabled);
}

/* ---------------------------------------
GUARD TYPES
---------------------------------------- */

type GuardResult = { allowed: true } | { allowed: false; reason: string };

/* ---------------------------------------
ENTRY GUARD
---------------------------------------- */

async function entryGuard(): Promise<GuardResult> {
  const { rows } = await pool.query(`
    SELECT realised_pl, closed_at
    FROM paper_trades
    WHERE is_closed = true
    ORDER BY closed_at DESC
    LIMIT 10
  `);

  if (!rows.length) return { allowed: true };

  const lastTradeTime = new Date(rows[0].closed_at).getTime();

  if (Date.now() - lastTradeTime < ENTRY_COOLDOWN_MINUTES * 60000) {
    return { allowed: false, reason: "COOLDOWN_ACTIVE" };
  }

  let losses = 0;

  for (const r of rows) {
    const pl = Number(r.realised_pl);

    if (!Number.isFinite(pl)) continue;

    if (pl < 0) {
      losses++;
      if (losses >= MAX_CONSECUTIVE_LOSSES) {
        return { allowed: false, reason: "LOSS_CLUSTER_PROTECTION" };
      }
    } else break;
  }

  return { allowed: true };
}

/* ---------------------------------------
ENTRY LOCK
---------------------------------------- */

async function withEntryLock<T>(fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query(`SELECT pg_advisory_lock($1)`, [ENTRY_LOCK_KEY]);
    return await fn();
  } finally {
    await client.query(`SELECT pg_advisory_unlock($1)`, [ENTRY_LOCK_KEY]);
    client.release();
  }
}

/* ---------------------------------------
ENGINE
---------------------------------------- */

export async function startPriceLoop() {
  if (running) return;

  const locked = await acquireEngineLock();
  if (!locked) return;

  if (!(await automationEnabled())) {
    await releaseEngineLock();
    return;
  }

  running = true;
  globalThis.__OMEGA_ENGINE_RUNNING__ = true;

  const loopId = nextLoopId();
  const provider = getPriceProvider(SYMBOL, TIMEFRAME);

  let lastMinute: number | null = null;
  let lastAutomationCheck = Date.now();

  try {
    while (running && currentLoopId() === loopId) {
      if (Date.now() - lastAutomationCheck > AUTOMATION_CHECK_MS) {
        lastAutomationCheck = Date.now();
        if (!(await automationEnabled())) break;
      }

      const candles: Candle[] = await provider.fetchCandles();

      if (!candles?.length || candles.length < MIN_REQUIRED_CANDLES) {
        await sleep(2000);
        continue;
      }

      const latest = candles[candles.length - 1];
      const minute = minuteBucket(Number(latest.timestamp));

      if (minute === lastMinute) {
        await sleep(msUntilNextMinute());
        continue;
      }

      lastMinute = minute;

      const closes = candles.map((c) => Number(c.close));
      const price = Number(latest.close);

      const exited = await runExitWatcher(latest);
      if (exited) continue;

      if (!TEST_MODE && !sessionOpen()) continue;

      const spread = spreadPips(latest);
      if (!TEST_MODE && spread !== null && spread > MAX_SPREAD_PIPS) continue;

      if (!TEST_MODE) {
        if (
          rangePips(closes.slice(-ACTIVATION_WINDOW)) <
          MIN_ACTIVATION_RANGE_PIPS
        )
          continue;

        if (newsSpike(closes)) continue;

        if (avgAbsReturnPct(closes.slice(-REGIME_WINDOW)) < REGIME_MIN_PCT)
          continue;

        const vol = avgAbsReturnPct(closes.slice(-VOL_WINDOW));
        if (vol < MIN_VOL_PCT) continue;

        const prev = closes[closes.length - 2];
        const last = closes[closes.length - 1];

        if (Math.abs(last - prev) / prev > vol * SPIKE_MULTIPLIER) continue;

        const rangeValues = closes.slice(-RANGE_WINDOW);

        const rangePct =
          (Math.max(...rangeValues) - Math.min(...rangeValues)) /
          Math.min(...rangeValues);

        if (rangePct < MIN_RANGE_PCT) continue;
      }

      const emaNow = calculateEMA(closes, EMA_PERIOD);
      const emaPrev = calculateEMA(closes.slice(0, -1), EMA_PERIOD);
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
          direction: "BUY" as OrderSide,
          sl: price - dist,
          tp1: price + dist,
          reason: "TEST_SIGNAL",
        };

        console.log("[TEST_MODE] forced signal");
      }

      if (!signal) continue;

      const entry =
        signal.direction === "BUY"
          ? Number(latest.ask ?? latest.close)
          : Number(latest.bid ?? latest.close);

      if (!TEST_MODE && emaNow !== null) {
        if (signal.direction === "BUY") {
          if (entry < emaNow || emaSlope <= 0) continue;
        }

        if (signal.direction === "SELL") {
          if (entry > emaNow || emaSlope >= 0) continue;
        }
      }

      const sl = Number(signal.sl);
      if (!Number.isFinite(sl)) continue;

      const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

      if (!(riskDist > 0)) continue;

      const tp1 =
        signal.direction === "BUY"
          ? entry + riskDist * RR_TARGET
          : entry - riskDist * RR_TARGET;

      const guard: GuardResult = TEST_MODE
        ? { allowed: true }
        : await entryGuard();

      if (!guard.allowed) {
        console.log("[ENTRY_BLOCKED]", guard.reason);
        continue;
      }

      const risk = TEST_MODE
        ? ({ allowed: true } as const)
        : await riskGate(signal);

      if (!risk.allowed) {
        console.log("[ENTRY_BLOCKED]", risk.reason);
        continue;
      }

      const lotSize = calculateLotSize(entry, sl);
      if (!(lotSize > 0)) continue;

      await withEntryLock(async () => {
        const { rows } = await pool.query(
          `SELECT 1 FROM paper_trades WHERE is_closed = false LIMIT 1`,
        );

        if (rows.length) return;

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
            SIDE: signal.direction,
            ENTRY: fmt(entry),
            SL: fmt(sl),
            TP1: fmt(tp1),
            LOT: lotSize,
          });
        }
      });
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
