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

const LOOKBACK = 6;

const MIN_RISK_PCT = 0.00015; // 0.015%
const MAX_RISK_PCT = 0.05; // 5%

/* -------------------------------------------------
UTILS
-------------------------------------------------- */

function safeNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* -------------------------------------------------
STRUCTURE CHECK
-------------------------------------------------- */

export function runStructureCheck(
  input: StructureInput,
): StructureSignal | null {
  const { symbol, candles } = input;

  if (!Array.isArray(candles) || candles.length < LOOKBACK + 1) {
    return null;
  }

  const recent = candles.slice(-LOOKBACK);

  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];

  const lastClose = safeNum(last?.close);
  const prevClose = safeNum(prev?.close);

  if (lastClose === null || prevClose === null) {
    return null;
  }

  const highs: number[] = [];
  const lows: number[] = [];

  for (const c of recent) {
    const h = safeNum(c.high);
    const l = safeNum(c.low);

    if (h === null || l === null) return null;

    highs.push(h);
    lows.push(l);
  }

  const rangeHigh = Math.max(...highs);
  const rangeLow = Math.min(...lows);

  /* ------------------------------
BUY MOMENTUM
------------------------------ */

  if (lastClose > prevClose) {
    const sl = rangeLow;

    const risk = lastClose - sl;
    if (!(risk > 0)) return null;

    const riskPct = risk / lastClose;

    if (riskPct >= MIN_RISK_PCT && riskPct <= MAX_RISK_PCT) {
      return {
        symbol,
        direction: "BUY",
        sl,
        tp1: lastClose + risk,
        reason: "FAST_MOMENTUM_UP",
      };
    }
  }

  /* ------------------------------
SELL MOMENTUM
------------------------------ */

  if (lastClose < prevClose) {
    const sl = rangeHigh;

    const risk = sl - lastClose;
    if (!(risk > 0)) return null;

    const riskPct = risk / lastClose;

    if (riskPct >= MIN_RISK_PCT && riskPct <= MAX_RISK_PCT) {
      return {
        symbol,
        direction: "SELL",
        sl,
        tp1: lastClose - risk,
        reason: "FAST_MOMENTUM_DOWN",
      };
    }
  }

  return null;
}
