import { getPriceProvider } from "@/lib/prices/provider";
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
const POLL_MS = 5000;

const RR_TARGET = 1.25;

/* volatility filters */

const VOL_WINDOW = 20;
const MIN_VOL_PCT = 0.00015;

const REGIME_WINDOW = 100;
const REGIME_MIN_PCT = 0.00012;

const SPIKE_MULTIPLIER = 2;

const EMA_PERIOD = 200;

const SESSION_START = 7;
const SESSION_END = 22;

/* forex filters */

const MAX_SPREAD_PIPS = 1.5;

/* consolidation filter */

const RANGE_WINDOW = 15;
const MIN_RANGE_PCT = 0.00025;

/* london activation (30-minute range) */

const ACTIVATION_WINDOW = 30;
const MIN_ACTIVATION_RANGE_PIPS = 8;

/* news guard */

const NEWS_LOOKBACK = 5;
const NEWS_SPIKE_PIPS = 12;

/* position sizing */

const PAPER_ACCOUNT_EQUITY = 10000;
const RISK_PER_TRADE = 0.005;

const PIP_SIZE = 0.0001;
const PIP_VALUE_PER_LOT = 10;

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

  let ema = values.slice(0, period).reduce((a, b) => a + b) / period;

  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }

  return ema;
}

function sessionOpen() {
  const hour = new Date().getUTCHours();
  return hour >= SESSION_START && hour <= SESSION_END;
}

function calcRangePct(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return (max - min) / min;
}

/* ---------------------------------------
30-MINUTE RANGE (PIPS)
---------------------------------------- */

function calculateRangePips(values: number[]) {
  const max = Math.max(...values);
  const min = Math.min(...values);

  const range = max - min;

  return range / PIP_SIZE;
}

/* ---------------------------------------
NEWS VOLATILITY GUARD
---------------------------------------- */

function newsSpikeDetected(values: number[]) {
  const recent = values.slice(-NEWS_LOOKBACK);

  const max = Math.max(...recent);
  const min = Math.min(...recent);

  const range = (max - min) / PIP_SIZE;

  return range >= NEWS_SPIKE_PIPS;
}

/* ---------------------------------------
SPREAD CALCULATION
---------------------------------------- */

function calculateSpreadPips(candle: any) {
  if (!candle.bid || !candle.ask) return null;

  const spread = candle.ask - candle.bid;

  return spread / PIP_SIZE;
}

/* ---------------------------------------
POSITION SIZING
---------------------------------------- */

function calculateLotSize(entry: number, stop: number) {
  const riskAmount = PAPER_ACCOUNT_EQUITY * RISK_PER_TRADE;

  const stopDistance = Math.abs(entry - stop);

  const stopPips = stopDistance / PIP_SIZE;

  if (stopPips <= 0) return 0;

  const lotSize = riskAmount / (stopPips * PIP_VALUE_PER_LOT);

  return Number(lotSize.toFixed(3));
}

/* ---------------------------------------
PUBLIC API
---------------------------------------- */

export async function startPriceLoop() {
  if (running) {
    console.log("[ENGINE] already running");
    return;
  }

  running = true;

  const loopId = nextLoopId();

  console.log("[ENGINE] started", { loopId, SYMBOL, TIMEFRAME });

  const provider = getPriceProvider(SYMBOL, TIMEFRAME);

  let lastCandleTs: number | null = null;

  while (currentLoopId() === loopId) {
    const started = Date.now();

    try {
      const candles = await provider.fetchCandles();
      if (!candles.length) throw new Error("NO_CANDLES");

      const latest = candles[candles.length - 1];

      const price = Number(latest.close);

      const spreadPips = calculateSpreadPips(latest);

      if (spreadPips && spreadPips > MAX_SPREAD_PIPS) {
        console.log("[SKIP] spread too wide", spreadPips);
        continue;
      }

      await runExitWatcher(price);

      if (!sessionOpen()) continue;

      const minuteTs = Math.floor(Number(latest.timestamp) / 60000);

      if (lastCandleTs === minuteTs) continue;

      lastCandleTs = minuteTs;

      console.log("[CANDLE]", price);

      const closes = candles
        .map((c) => Number(c.close))
        .filter(Number.isFinite);

      /* london activation */

      const activationCloses = closes.slice(-ACTIVATION_WINDOW);

      const rangePips = calculateRangePips(activationCloses);

      if (rangePips < MIN_ACTIVATION_RANGE_PIPS) {
        console.log("[SKIP] london range not active", rangePips);
        continue;
      }

      /* news spike guard */

      if (newsSpikeDetected(closes)) {
        console.log("[SKIP] news volatility spike");
        continue;
      }

      /* volatility regime */

      const regimeCloses = closes.slice(-REGIME_WINDOW);
      const regimeVol = avgAbsReturnPct(regimeCloses);

      if (regimeVol < REGIME_MIN_PCT) {
        console.log("[SKIP] low volatility regime");
        continue;
      }

      /* short volatility */

      const shortCloses = closes.slice(-VOL_WINDOW);
      const vol = avgAbsReturnPct(shortCloses);

      if (vol < MIN_VOL_PCT) continue;

      const lastMove =
        Math.abs(closes[closes.length - 1] - closes[closes.length - 2]) /
        closes[closes.length - 2];

      if (lastMove > vol * SPIKE_MULTIPLIER) {
        console.log("[SKIP] volatility spike");
        continue;
      }

      const rangeCloses = closes.slice(-RANGE_WINDOW);
      const rangePct = calcRangePct(rangeCloses);

      if (rangePct < MIN_RANGE_PCT) {
        console.log("[SKIP] tight consolidation");
        continue;
      }

      const emaNow = calculateEMA(closes, EMA_PERIOD);
      const emaPrev = calculateEMA(closes.slice(0, -1), EMA_PERIOD);

      if (!emaNow || !emaPrev) continue;

      const emaSlope = emaNow - emaPrev;

      const signal = await runStructureCheck({
        symbol: SYMBOL,
        timeframe: TIMEFRAME,
        candles,
      });

      if (!signal) continue;

      if (signal.direction === "BUY") {
        if (price < emaNow) continue;
        if (emaSlope <= 0) continue;
      }

      if (signal.direction === "SELL") {
        if (price > emaNow) continue;
        if (emaSlope >= 0) continue;
      }

      const entry = price;
      const sl = Number(signal.sl);

      if (!Number.isFinite(entry) || !Number.isFinite(sl)) continue;

      const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

      if (!(riskDist > entry * 0.00005)) continue;

      const tp1 =
        signal.direction === "BUY"
          ? entry + riskDist * RR_TARGET
          : entry - riskDist * RR_TARGET;

      const risk = await riskGate(signal, entry);

      if (!risk.allowed) {
        console.log("[ENTRY_BLOCKED]", risk.reason);
        continue;
      }

      const lotSize = calculateLotSize(entry, sl);

      if (lotSize <= 0) continue;

      await withDbLock(async () => {
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
            tradeId: res.tradeId,
            side: signal.direction,
            entry,
            sl,
            tp1,
            lotSize,
          });
        }
      });
    } catch (err) {
      console.error("[ENGINE_ERROR]", err);
    }

    const sleep = Math.max(POLL_MS - (Date.now() - started), 0);
    await new Promise((r) => setTimeout(r, sleep));
  }

  running = false;
  console.log("[ENGINE] stopped");
}

export function stopPriceLoop() {
  nextLoopId();
  running = false;
  console.log("[ENGINE] stop requested");
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
