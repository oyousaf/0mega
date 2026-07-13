import type { Candle } from "@/types/trade";

/* -------------------------------------------------
TYPES
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

type SwingPoint = {
  index: number;
  price: number;
  type: "HIGH" | "LOW";
};

type SetupCandidate = {
  signal: StructureSignal;
  breakIndex: number;
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
NUMERIC HELPERS
-------------------------------------------------- */

function safeNum(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function candleValues(candle: Candle) {
  const open = safeNum(candle.open);
  const high = safeNum(candle.high);
  const low = safeNum(candle.low);
  const close = safeNum(candle.close);

  if (open === null || high === null || low === null || close === null) {
    return null;
  }

  if (high < low) {
    return null;
  }

  return {
    open,
    high,
    low,
    close,
  };
}

/* -------------------------------------------------
ATR
-------------------------------------------------- */

function calculateATR(candles: Candle[], period: number): number | null {
  if (candles.length < period + 1) {
    return null;
  }

  const trueRanges: number[] = [];

  for (let i = candles.length - period; i < candles.length; i++) {
    const current = candleValues(candles[i]);
    const previousClose = safeNum(candles[i - 1]?.close);

    if (!current || previousClose === null) {
      return null;
    }

    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previousClose),
        Math.abs(current.low - previousClose),
      ),
    );
  }

  if (!trueRanges.length) {
    return null;
  }

  return trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;
}

/* -------------------------------------------------
SWINGS
-------------------------------------------------- */

function findSwings(candles: Candle[]): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = SWING_LEFT; i < candles.length - SWING_RIGHT; i++) {
    const current = candleValues(candles[i]);

    if (!current) {
      continue;
    }

    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = i - SWING_LEFT; j <= i + SWING_RIGHT; j++) {
      if (j === i) {
        continue;
      }

      const comparison = candleValues(candles[j]);

      if (!comparison) {
        isSwingHigh = false;
        isSwingLow = false;
        break;
      }

      if (comparison.high >= current.high) {
        isSwingHigh = false;
      }

      if (comparison.low <= current.low) {
        isSwingLow = false;
      }
    }

    if (isSwingHigh) {
      swings.push({
        index: i,
        price: current.high,
        type: "HIGH",
      });
    }

    if (isSwingLow) {
      swings.push({
        index: i,
        price: current.low,
        type: "LOW",
      });
    }
  }

  return swings;
}

/* -------------------------------------------------
CONFIRMATION CANDLES
-------------------------------------------------- */

function strongBullishConfirmation(candle: Candle): boolean {
  const values = candleValues(candle);

  if (!values) {
    return false;
  }

  const range = values.high - values.low;

  if (!(range > 0)) {
    return false;
  }

  const body = Math.abs(values.close - values.open);
  const bodyRatio = body / range;
  const closeStrength = (values.close - values.low) / range;

  return (
    values.close > values.open &&
    bodyRatio >= MIN_BODY_RATIO &&
    closeStrength >= MIN_CLOSE_STRENGTH
  );
}

function strongBearishConfirmation(candle: Candle): boolean {
  const values = candleValues(candle);

  if (!values) {
    return false;
  }

  const range = values.high - values.low;

  if (!(range > 0)) {
    return false;
  }

  const body = Math.abs(values.close - values.open);
  const bodyRatio = body / range;
  const closeStrength = (values.high - values.close) / range;

  return (
    values.close < values.open &&
    bodyRatio >= MIN_BODY_RATIO &&
    closeStrength >= MIN_CLOSE_STRENGTH
  );
}

/* -------------------------------------------------
BREAK DETECTION
The current candle is reserved for confirmation,
so breaks are searched only up to currentIndex - 1.
-------------------------------------------------- */

function findBullishBreakIndex(
  candles: Candle[],
  swing: SwingPoint,
  breakBuffer: number,
): number | null {
  const finalBreakIndex = candles.length - 2;

  for (let i = finalBreakIndex; i > swing.index; i--) {
    const close = safeNum(candles[i]?.close);

    if (close !== null && close > swing.price + breakBuffer) {
      return i;
    }
  }

  return null;
}

function findBearishBreakIndex(
  candles: Candle[],
  swing: SwingPoint,
  breakBuffer: number,
): number | null {
  const finalBreakIndex = candles.length - 2;

  for (let i = finalBreakIndex; i > swing.index; i--) {
    const close = safeNum(candles[i]?.close);

    if (close !== null && close < swing.price - breakBuffer) {
      return i;
    }
  }

  return null;
}

/* -------------------------------------------------
RETEST DETECTION
Retests begin strictly after the break candle.
-------------------------------------------------- */

function findBullishRetestIndex(
  candles: Candle[],
  level: number,
  breakIndex: number,
  atr: number,
): number | null {
  const currentIndex = candles.length - 1;
  const earliestAllowed = Math.max(
    breakIndex + 1,
    currentIndex - MAX_RETEST_CANDLES + 1,
  );

  const buffer = atr * RETEST_BUFFER_ATR;

  for (let i = earliestAllowed; i <= currentIndex; i++) {
    const values = candleValues(candles[i]);

    if (!values) {
      continue;
    }

    const touched =
      values.low <= level + buffer && values.high >= level - buffer;

    const heldLevel = values.close >= level - buffer;

    if (touched && heldLevel) {
      return i;
    }
  }

  return null;
}

function findBearishRetestIndex(
  candles: Candle[],
  level: number,
  breakIndex: number,
  atr: number,
): number | null {
  const currentIndex = candles.length - 1;
  const earliestAllowed = Math.max(
    breakIndex + 1,
    currentIndex - MAX_RETEST_CANDLES + 1,
  );

  const buffer = atr * RETEST_BUFFER_ATR;

  for (let i = earliestAllowed; i <= currentIndex; i++) {
    const values = candleValues(candles[i]);

    if (!values) {
      continue;
    }

    const touched =
      values.high >= level - buffer && values.low <= level + buffer;

    const heldLevel = values.close <= level + buffer;

    if (touched && heldLevel) {
      return i;
    }
  }

  return null;
}

/* -------------------------------------------------
STRUCTURAL STOP HELPERS
-------------------------------------------------- */

function lowestLow(
  candles: Candle[],
  fromIndex: number,
  toIndex: number,
): number | null {
  let lowest: number | null = null;

  for (let i = fromIndex; i <= toIndex; i++) {
    const low = safeNum(candles[i]?.low);

    if (low === null) {
      continue;
    }

    lowest = lowest === null ? low : Math.min(lowest, low);
  }

  return lowest;
}

function highestHigh(
  candles: Candle[],
  fromIndex: number,
  toIndex: number,
): number | null {
  let highest: number | null = null;

  for (let i = fromIndex; i <= toIndex; i++) {
    const high = safeNum(candles[i]?.high);

    if (high === null) {
      continue;
    }

    highest = highest === null ? high : Math.max(highest, high);
  }

  return highest;
}

function riskValid(entry: number, stop: number): boolean {
  const riskDistance = Math.abs(entry - stop);

  if (!(riskDistance > 0)) {
    return false;
  }

  const riskPct = riskDistance / entry;

  return riskPct >= MIN_RISK_PCT && riskPct <= MAX_RISK_PCT;
}

/* -------------------------------------------------
BUY SETUP
-------------------------------------------------- */

function findBuySetup(params: {
  symbol: string;
  candles: Candle[];
  swings: SwingPoint[];
  atr: number;
  breakBuffer: number;
  slBuffer: number;
}): SetupCandidate | null {
  const { symbol, candles, swings, atr, breakBuffer, slBuffer } = params;

  const currentIndex = candles.length - 1;
  const current = candleValues(candles[currentIndex]);

  if (!current || !strongBullishConfirmation(candles[currentIndex])) {
    return null;
  }

  const swingHighs = swings.filter((swing) => swing.type === "HIGH").reverse();

  for (const swingHigh of swingHighs) {
    const breakIndex = findBullishBreakIndex(candles, swingHigh, breakBuffer);

    if (breakIndex === null) {
      continue;
    }

    const retestIndex = findBullishRetestIndex(
      candles,
      swingHigh.price,
      breakIndex,
      atr,
    );

    if (retestIndex === null) {
      continue;
    }

    /*
    Current confirmation must close back above the
    broken structure level.
    */
    if (current.close <= swingHigh.price) {
      continue;
    }

    const structuralLow = lowestLow(candles, breakIndex + 1, currentIndex);

    if (structuralLow === null) {
      continue;
    }

    const stop = structuralLow - slBuffer;

    if (!riskValid(current.close, stop)) {
      continue;
    }

    return {
      breakIndex,

      signal: {
        symbol,
        direction: "BUY",
        sl: stop,
        tp1: current.close + Math.abs(current.close - stop),
        reason: "BOS_RETEST_BUY",
      },
    };
  }

  return null;
}

/* -------------------------------------------------
SELL SETUP
-------------------------------------------------- */

function findSellSetup(params: {
  symbol: string;
  candles: Candle[];
  swings: SwingPoint[];
  atr: number;
  breakBuffer: number;
  slBuffer: number;
}): SetupCandidate | null {
  const { symbol, candles, swings, atr, breakBuffer, slBuffer } = params;

  const currentIndex = candles.length - 1;
  const current = candleValues(candles[currentIndex]);

  if (!current || !strongBearishConfirmation(candles[currentIndex])) {
    return null;
  }

  const swingLows = swings.filter((swing) => swing.type === "LOW").reverse();

  for (const swingLow of swingLows) {
    const breakIndex = findBearishBreakIndex(candles, swingLow, breakBuffer);

    if (breakIndex === null) {
      continue;
    }

    const retestIndex = findBearishRetestIndex(
      candles,
      swingLow.price,
      breakIndex,
      atr,
    );

    if (retestIndex === null) {
      continue;
    }

    if (current.close >= swingLow.price) {
      continue;
    }

    const structuralHigh = highestHigh(candles, breakIndex + 1, currentIndex);

    if (structuralHigh === null) {
      continue;
    }

    const stop = structuralHigh + slBuffer;

    if (!riskValid(current.close, stop)) {
      continue;
    }

    return {
      breakIndex,

      signal: {
        symbol,
        direction: "SELL",
        sl: stop,
        tp1: current.close - Math.abs(stop - current.close),
        reason: "BOS_RETEST_SELL",
      },
    };
  }

  return null;
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

  const atr = calculateATR(recent, ATR_PERIOD);

  if (atr === null || !(atr > 0)) {
    return null;
  }

  const swings = findSwings(recent);

  if (!swings.length) {
    return null;
  }

  const breakBuffer = atr * BREAK_BUFFER_ATR;
  const slBuffer = atr * SL_BUFFER_ATR;

  const buySetup = findBuySetup({
    symbol,
    candles: recent,
    swings,
    atr,
    breakBuffer,
    slBuffer,
  });

  const sellSetup = findSellSetup({
    symbol,
    candles: recent,
    swings,
    atr,
    breakBuffer,
    slBuffer,
  });

  if (buySetup && sellSetup) {
    /*
    If both appear valid, use whichever structure
    break happened more recently.
    */
    return buySetup.breakIndex >= sellSetup.breakIndex
      ? buySetup.signal
      : sellSetup.signal;
  }

  return buySetup?.signal ?? sellSetup?.signal ?? null;
}
