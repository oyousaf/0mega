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

/* ---------------------------------------
TYPES
---------------------------------------- */

type StructureSignal = NonNullable<
  Awaited<ReturnType<typeof runStructureCheck>>
>;

type EngineTickResult =
  | { ok: true; action: "EXIT_ONLY" }
  | { ok: true; action: "NO_SIGNAL" }
  | { ok: true; action: "NO_ENTRY" }
  | { ok: true; action: "TRADE_OPENED"; tradeId: number | string }
  | { ok: false; reason: string; error?: unknown };

/* ---------------------------------------
UTILS
---------------------------------------- */

function avgAbsReturnPct(values: number[]) {
  if (values.length < 2) return 0;

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

  return count > 0 ? sum / count : 0;
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
  if (!values.length) return 0;
  return (Math.max(...values) - Math.min(...values)) / PIP_SIZE;
}

function newsSpike(values: number[]) {
  const recent = values.slice(-NEWS_LOOKBACK);
  if (recent.length < 2) return false;

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

function buildTestSignal(price: number): StructureSignal {
  const dist = PIP_SIZE * 5;

  return {
    symbol: SYMBOL,
    direction: "BUY" as OrderSide,
    sl: price - dist,
    tp1: price + dist,
    reason: "TEST_SIGNAL",
  } as StructureSignal;
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
  try {
    await pool.query(`SELECT pg_advisory_unlock($1)`, [ENGINE_LOCK_KEY]);
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
ENTRY LOCK
---------------------------------------- */

async function withEntryLock<T>(fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query(`SELECT pg_advisory_lock($1)`, [ENTRY_LOCK_KEY]);
    return await fn();
  } finally {
    try {
      await client.query(`SELECT pg_advisory_unlock($1)`, [ENTRY_LOCK_KEY]);
    } catch (err) {
      console.error("[ENTRY_UNLOCK_FAILED]", err);
    }

    client.release();
  }
}

/* ---------------------------------------
ENGINE TICK
Vercel-safe: one pass only
---------------------------------------- */

export async function runPriceTick(): Promise<EngineTickResult> {
  const locked = await acquireEngineLock();

  if (!locked) {
    console.log("[ENGINE_TICK] skipped: lock busy");
    return {
      ok: false,
      reason: "LOCK_BUSY",
    };
  }

  try {
    if (!(await automationEnabled())) {
      console.log("[ENGINE_TICK] skipped: automation disabled");
      return {
        ok: false,
        reason: "AUTOMATION_DISABLED",
      };
    }

    const provider = getPriceProvider(SYMBOL, TIMEFRAME);
    const candles: Candle[] = await provider.fetchCandles();

    if (!candles?.length) {
      console.log("[ENGINE_TICK] skipped: no candles");
      return { ok: false, reason: "NO_CANDLES" };
    }

    if (candles.length < MIN_REQUIRED_CANDLES) {
      console.log("[ENGINE_TICK] skipped: insufficient candles", {
        count: candles.length,
        required: MIN_REQUIRED_CANDLES,
      });

      return { ok: false, reason: "INSUFFICIENT_CANDLES" };
    }

    const latest = candles[candles.length - 1];
    const price = Number(latest.close);

    console.log("[NEW_CANDLE]", {
      symbol: SYMBOL,
      timeframe: TIMEFRAME,
      timestamp: latest.timestamp,
      close: fmt(price),
    });

    if (!Number.isFinite(price) || price <= 0) {
      console.log("[SKIP] invalid candle price");
      return { ok: false, reason: "INVALID_PRICE" };
    }

    const exited = await runExitWatcher(latest);
    if (exited) {
      return { ok: true, action: "EXIT_ONLY" };
    }

    if (!TEST_MODE && !sessionOpen()) {
      console.log("[SKIP] session closed");
      return { ok: false, reason: "SESSION_CLOSED" };
    }

    const spread = spreadPips(latest);

    if (!TEST_MODE && spread !== null && spread > MAX_SPREAD_PIPS) {
      console.log("[SKIP] spread too wide", { spread: fmt(spread, 2) });
      return { ok: false, reason: "SPREAD_TOO_WIDE" };
    }

    const closes = candles
      .map((c) => Number(c.close))
      .filter((v): v is number => Number.isFinite(v) && v > 0);

    if (closes.length < MIN_REQUIRED_CANDLES) {
      console.log("[SKIP] insufficient valid closes");
      return { ok: false, reason: "INSUFFICIENT_VALID_CLOSES" };
    }

    if (!TEST_MODE) {
      const activationValues = closes.slice(-ACTIVATION_WINDOW);
      const activationRange = rangePips(activationValues);

      if (activationRange < MIN_ACTIVATION_RANGE_PIPS) {
        console.log("[SKIP] london range not active", {
          activationRange: fmt(activationRange, 2),
        });

        return { ok: false, reason: "LONDON_RANGE_INACTIVE" };
      }

      if (newsSpike(closes)) {
        console.log("[SKIP] news spike");
        return { ok: false, reason: "NEWS_SPIKE" };
      }

      const regimeVol = avgAbsReturnPct(closes.slice(-REGIME_WINDOW));
      if (regimeVol < REGIME_MIN_PCT) {
        console.log("[SKIP] low volatility regime", {
          regimeVol: fmt(regimeVol, 6),
        });

        return { ok: false, reason: "LOW_REGIME_VOL" };
      }

      const vol = avgAbsReturnPct(closes.slice(-VOL_WINDOW));
      if (vol < MIN_VOL_PCT) {
        console.log("[SKIP] short volatility too low", {
          vol: fmt(vol, 6),
        });

        return { ok: false, reason: "LOW_SHORT_VOL" };
      }

      const prev = closes[closes.length - 2];
      const last = closes[closes.length - 1];
      const move = prev > 0 ? Math.abs(last - prev) / prev : 0;

      if (move > vol * SPIKE_MULTIPLIER) {
        console.log("[SKIP] volatility spike", {
          move: fmt(move, 6),
          vol: fmt(vol, 6),
        });

        return { ok: false, reason: "VOL_SPIKE" };
      }

      const rangeValues = closes.slice(-RANGE_WINDOW);
      const minRangeValue = Math.min(...rangeValues);
      const maxRangeValue = Math.max(...rangeValues);
      const rangePct =
        minRangeValue > 0 ? (maxRangeValue - minRangeValue) / minRangeValue : 0;

      if (rangePct < MIN_RANGE_PCT) {
        console.log("[SKIP] tight consolidation", {
          rangePct: fmt(rangePct, 6),
        });

        return { ok: false, reason: "TIGHT_CONSOLIDATION" };
      }
    }

    const emaNow = calculateEMA(closes, EMA_PERIOD);
    const emaPrev = calculateEMA(closes.slice(0, -1), EMA_PERIOD);

    if (!TEST_MODE && (emaNow === null || emaPrev === null)) {
      console.log("[SKIP] ema unavailable");
      return { ok: false, reason: "EMA_UNAVAILABLE" };
    }

    const emaSlope = (emaNow ?? 0) - (emaPrev ?? 0);

    const structureSignal = await runStructureCheck({
      symbol: SYMBOL,
      timeframe: TIMEFRAME,
      candles,
    });

    const signal: StructureSignal | null =
      structureSignal ?? (TEST_MODE ? buildTestSignal(price) : null);

    if (TEST_MODE && !structureSignal) {
      console.log("[TEST_MODE] forced signal");
    }

    if (!signal) {
      return { ok: true, action: "NO_SIGNAL" };
    }

    if (!TEST_MODE && emaNow !== null) {
      if (signal.direction === "BUY" && (price < emaNow || emaSlope <= 0)) {
        console.log("[SKIP] buy trend filter");
        return { ok: false, reason: "BUY_TREND_FILTER" };
      }

      if (signal.direction === "SELL" && (price > emaNow || emaSlope >= 0)) {
        console.log("[SKIP] sell trend filter");
        return { ok: false, reason: "SELL_TREND_FILTER" };
      }
    }

    const entry = price;
    const sl = Number(signal.sl);

    if (!Number.isFinite(sl) || sl <= 0) {
      console.log("[SKIP] invalid stop loss");
      return { ok: false, reason: "INVALID_SL" };
    }

    const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

    if (!(riskDist > 0)) {
      console.log("[SKIP] invalid risk distance");
      return { ok: false, reason: "INVALID_RISK_DISTANCE" };
    }

    const tp1 =
      signal.direction === "BUY"
        ? entry + riskDist * RR_TARGET
        : entry - riskDist * RR_TARGET;

    if (!Number.isFinite(tp1) || tp1 <= 0) {
      console.log("[SKIP] invalid tp1");
      return { ok: false, reason: "INVALID_TP1" };
    }

    const risk = TEST_MODE
      ? { allowed: true as const }
      : await riskGate(signal);

    if (!risk.allowed) {
      console.log("[ENTRY_BLOCKED]", risk.reason);
      return { ok: false, reason: `RISK_BLOCKED:${risk.reason}` };
    }

    const lotSize = calculateLotSize(entry, sl);

    if (!(lotSize > 0)) {
      console.log("[SKIP] lot size invalid");
      return { ok: false, reason: "INVALID_LOT_SIZE" };
    }

    let result: EngineTickResult = { ok: true, action: "NO_ENTRY" };

    await withEntryLock(async () => {
      const { rows } = await pool.query(
        `SELECT 1 FROM paper_trades WHERE is_closed = false LIMIT 1`,
      );

      if (rows.length) {
        console.log("[SKIP] open trade already exists");
        result = { ok: false, reason: "OPEN_TRADE_EXISTS" };
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

      if (!res.success) {
        console.log("[TRADE_FAILED]", {
          symbol: SYMBOL,
          side: signal.direction,
          entry: fmt(entry),
          sl: fmt(sl),
          tp1: fmt(tp1),
          lotSize: fmt(lotSize, 3),
          error: res.error,
        });

        result = { ok: false, reason: "TRADE_FAILED", error: res.error };
        return;
      }

      const riskPips = Math.abs(entry - sl) / PIP_SIZE;

      const tp2 =
        signal.direction === "BUY"
          ? entry + riskDist * RR_TARGET * 2
          : entry - riskDist * RR_TARGET * 2;

      console.log("[TRADE_OPENED]", {
        TRADE_ID: res.tradeId,

        SYMBOL: SYMBOL,
        TIMEFRAME: TIMEFRAME,

        SIDE: signal.direction,
        STRATEGY: signal.reason,

        ENTRY_PRICE: fmt(entry),
        STOP_LOSS: fmt(sl),

        TAKE_PROFIT_1: fmt(tp1),
        TAKE_PROFIT_2: fmt(tp2),

        RR_TARGET: RR_TARGET,

        LOT_SIZE: fmt(lotSize, 3),

        RISK_PIPS: fmt(riskPips, 2),

        SPREAD_PIPS: spread !== null ? fmt(spread, 2) : null,

        EMA_200: emaNow !== null ? fmt(emaNow) : null,
        EMA_SLOPE: fmt(emaSlope, 6),

        TEST_MODE: TEST_MODE,
      });

      result = {
        ok: true,
        action: "TRADE_OPENED",
        tradeId: res.tradeId,
      };
    });

    return result;
  } catch (err) {
    console.error("[ENGINE_TICK_ERROR]", err);
    return {
      ok: false,
      reason: "ENGINE_TICK_ERROR",
      error: err,
    };
  } finally {
    await releaseEngineLock();
  }
}

/* ---------------------------------------
LEGACY COMPAT
---------------------------------------- */

export async function startPriceLoop() {
  return runPriceTick();
}

export function stopPriceLoop() {
  console.log("[ENGINE] no persistent loop to stop");
}
