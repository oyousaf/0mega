import { getPriceProvider } from "@/lib/prices/provider";
import { runStructureCheck } from "@/lib/strategies/marketStructure";
import { riskGate } from "@/lib/trading/risk/riskGate";
import { pool } from "@/lib/neon";
import { runExitWatcher } from "./exitWatcher";
import { executeTradeIntent } from "@/lib/trading/automation/executionHelpers";

/* ---------------------------------------
   CONFIG — PAPER FORWARD TEST
---------------------------------------- */

const SYMBOL = "BTCUSDT";
const TIMEFRAME = "1m";
const POLL_MS = 5000;

const RR_TARGET = 1.25;

const VOL_WINDOW = 20;
const MIN_VOL_PCT = 0.0006;

const EMA_PERIOD = 200;

const SESSION_START = 7;
const SESSION_END = 22;

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

  console.log("[ENGINE] started", {
    loopId,
    SYMBOL,
    TIMEFRAME,
  });

  const provider = getPriceProvider(SYMBOL, TIMEFRAME);

  let lastCandleTs: number | null = null;

  while (currentLoopId() === loopId) {
    const started = Date.now();

    try {
      const candles = await provider.fetchCandles();
      if (!candles.length) throw new Error("NO_CANDLES");

      const latest = candles[candles.length - 1];
      const price = Number(latest.close);

      /* ALWAYS CHECK EXIT */
      await runExitWatcher(price);

      if (!sessionOpen()) continue;

      /* NEW CANDLE ONLY */
      const minuteTs = Math.floor(Number(latest.timestamp) / 60000);

      if (lastCandleTs === minuteTs) continue;

      lastCandleTs = minuteTs;

      console.log("[CANDLE]", price);

      /* VOL FILTER */
      const closes = candles
        .slice(-VOL_WINDOW)
        .map((c) => Number(c.close))
        .filter(Number.isFinite);

      const vol = avgAbsReturnPct(closes);

      if (vol < MIN_VOL_PCT) continue;

      /* EMA FILTER */
      const allCloses = candles
        .map((c) => Number(c.close))
        .filter(Number.isFinite);

      const ema = calculateEMA(allCloses, EMA_PERIOD);

      if (!ema) continue;

      /* STRUCTURE SIGNAL */
      const signal = await runStructureCheck({
        symbol: SYMBOL,
        timeframe: TIMEFRAME,
        candles,
      });

      if (!signal) continue;

      /* TREND ALIGNMENT */
      if (signal.direction === "BUY" && price < ema) continue;
      if (signal.direction === "SELL" && price > ema) continue;

      const entry = price;
      const sl = Number(signal.sl);

      if (!Number.isFinite(entry) || !Number.isFinite(sl)) continue;

      const riskDist = signal.direction === "BUY" ? entry - sl : sl - entry;

      if (!(riskDist > entry * 0.0002)) continue;

      const tp1 =
        signal.direction === "BUY"
          ? entry + riskDist * RR_TARGET
          : entry - riskDist * RR_TARGET;

      const risk = await riskGate(signal, entry);

      if (!risk.allowed) {
        console.log("[ENTRY_BLOCKED]", risk.reason);
        continue;
      }

      await withDbLock(async () => {
        const { rows } = await pool.query(
          `SELECT 1 FROM paper_trades WHERE is_closed = false LIMIT 1`,
        );

        if (rows.length) return;

        const res = await executeTradeIntent({
          signalId: signal.reason,
          symbol: SYMBOL,
          qty: 1,
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
