import type { Candle } from "@/types/trade";

/* -------------------------------------------------
STRUCTURE TYPES
-------------------------------------------------- */

type StructureInput = {
  symbol: string;
  timeframe: "1m" | "5m" | "15m";
  candles: Candle[];
};

type StructureSignal = {
  symbol: string;
  direction: "BUY" | "SELL";
  sl: number;
  tp1: number;
  reason: string;
};

/* -------------------------------------------------
CONFIG
-------------------------------------------------- */

const SWING_LEFT = 2;
const SWING_RIGHT = 2;

const STRUCTURE_LOOKBACK = 80;
const ATR_PERIOD = 14;

const MIN_RISK_PCT = 0.00015;
const MAX_RISK_PCT = 0.01;

const BREAK_BUFFER_ATR = 0.08;
const RETEST_BUFFER_ATR = 0.25;
const SL_BUFFER_ATR = 0.2;

const MIN_BODY_RATIO = 0.45;
const MIN_CLOSE_STRENGTH = 0.6;

const MAX_RETEST_CANDLES = 12;

/* -------------------------------------------------
UTILS
-------------------------------------------------- */

function safeNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bodySize(c: Candle) {
  const open = safeNum(c.open);
  const close = safeNum(c.close);
  if (open === null || close === null) return null;
  return Math.abs(close - open);
}

function candleRange(c: Candle) {
  const high = safeNum(c.high);
  const low = safeNum(c.low);
  if (high === null || low === null) return null;
  return Math.max(0, high - low);
}

function calculateATR(candles: Candle[], period: number) {
  if (candles.length < period + 1) return null;

  const trs: number[] = [];

  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];

    const high = safeNum(c.high);
    const low = safeNum(c.low);
    const prevClose = safeNum(prev.close);

    if (high === null || low === null || prevClose === null) return null;

    trs.push(
      Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose),
      ),
    );
  }

  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

type SwingPoint = {
  index: number;
  price: number;
  type: "HIGH" | "LOW";
};

function findSwings(candles: Candle[]) {
  const swings: SwingPoint[] = [];

  for (let i = SWING_LEFT; i < candles.length - SWING_RIGHT; i++) {
    const high = safeNum(candles[i].high);
    const low = safeNum(candles[i].low);

    if (high === null || low === null) continue;

    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = i - SWING_LEFT; j <= i + SWING_RIGHT; j++) {
      if (j === i) continue;

      const otherHigh = safeNum(candles[j].high);
      const otherLow = safeNum(candles[j].low);

      if (otherHigh === null || otherLow === null) {
        isSwingHigh = false;
        isSwingLow = false;
        break;
      }

      if (otherHigh >= high) isSwingHigh = false;
      if (otherLow <= low) isSwingLow = false;
    }

    if (isSwingHigh) {
      swings.push({ index: i, price: high, type: "HIGH" });
    }

    if (isSwingLow) {
      swings.push({ index: i, price: low, type: "LOW" });
    }
  }

  return swings;
}

function strongBullishConfirmation(c: Candle) {
  const open = safeNum(c.open);
  const close = safeNum(c.close);
  const high = safeNum(c.high);
  const low = safeNum(c.low);

  if (open === null || close === null || high === null || low === null) {
    return false;
  }

  const range = high - low;
  if (!(range > 0)) return false;

  const body = Math.abs(close - open);
  const closeStrength = (close - low) / range;

  return (
    close > open &&
    body / range >= MIN_BODY_RATIO &&
    closeStrength >= MIN_CLOSE_STRENGTH
  );
}

function strongBearishConfirmation(c: Candle) {
  const open = safeNum(c.open);
  const close = safeNum(c.close);
  const high = safeNum(c.high);
  const low = safeNum(c.low);

  if (open === null || close === null || high === null || low === null) {
    return false;
  }

  const range = high - low;
  if (!(range > 0)) return false;

  const body = Math.abs(close - open);
  const closeStrength = (high - close) / range;

  return (
    close < open &&
    body / range >= MIN_BODY_RATIO &&
    closeStrength >= MIN_CLOSE_STRENGTH
  );
}

function touchedLevel(c: Candle, level: number, buffer: number) {
  const high = safeNum(c.high);
  const low = safeNum(c.low);

  if (high === null || low === null) return false;

  return low <= level + buffer && high >= level - buffer;
}

function findRecentRetest(
  candles: Candle[],
  level: number,
  breakIndex: number,
  atr: number,
) {
  const start = Math.max(breakIndex + 1, candles.length - MAX_RETEST_CANDLES);
  const buffer = atr * RETEST_BUFFER_ATR;

  for (let i = start; i < candles.length; i++) {
    if (touchedLevel(candles[i], level, buffer)) {
      return true;
    }
  }

  return false;
}

function riskValid(entry: number, sl: number) {
  const risk = Math.abs(entry - sl);
  if (!(risk > 0)) return false;

  const riskPct = risk / entry;
  return riskPct >= MIN_RISK_PCT && riskPct <= MAX_RISK_PCT;
}

function latestOf(swings: SwingPoint[], type: "HIGH" | "LOW") {
  return [...swings].reverse().find((s) => s.type === type) ?? null;
}

/* -------------------------------------------------
STRUCTURE CHECK
-------------------------------------------------- */

export function runStructureCheck(
  input: StructureInput,
): StructureSignal | null {
  const { symbol, candles } = input;

  if (!Array.isArray(candles) || candles.length < STRUCTURE_LOOKBACK) {
    return null;
  }

  const recent = candles.slice(-STRUCTURE_LOOKBACK);
  const last = recent[recent.length - 1];

  const lastClose = safeNum(last.close);
  if (lastClose === null) return null;

  const atr = calculateATR(recent, ATR_PERIOD);
  if (atr === null || !(atr > 0)) return null;

  const swings = findSwings(recent);

  const lastSwingHigh = latestOf(swings, "HIGH");
  const lastSwingLow = latestOf(swings, "LOW");

  if (!lastSwingHigh || !lastSwingLow) return null;

  const breakBuffer = atr * BREAK_BUFFER_ATR;
  const slBuffer = atr * SL_BUFFER_ATR;

  /* -------------------------------------------------
  BUY: break previous swing high, retest, strong close
  -------------------------------------------------- */

  const brokeHigh = lastClose > lastSwingHigh.price + breakBuffer;

  if (brokeHigh && strongBullishConfirmation(last)) {
    const retested = findRecentRetest(
      recent,
      lastSwingHigh.price,
      lastSwingHigh.index,
      atr,
    );

    if (retested) {
      const sl = lastSwingLow.price - slBuffer;

      if (riskValid(lastClose, sl)) {
        return {
          symbol,
          direction: "BUY",
          sl,
          tp1: lastClose + Math.abs(lastClose - sl),
          reason: "BOS_RETEST_BUY",
        };
      }
    }
  }

  /* -------------------------------------------------
  SELL: break previous swing low, retest, strong close
  -------------------------------------------------- */

  const brokeLow = lastClose < lastSwingLow.price - breakBuffer;

  if (brokeLow && strongBearishConfirmation(last)) {
    const retested = findRecentRetest(
      recent,
      lastSwingLow.price,
      lastSwingLow.index,
      atr,
    );

    if (retested) {
      const sl = lastSwingHigh.price + slBuffer;

      if (riskValid(lastClose, sl)) {
        return {
          symbol,
          direction: "SELL",
          sl,
          tp1: lastClose - Math.abs(sl - lastClose),
          reason: "BOS_RETEST_SELL",
        };
      }
    }
  }

  return null;
}
