type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

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

const LOOKBACK = 20;

// tuned for %-based synthetic candles
const MOMENTUM_MULT = 1.05;

// risk bounds (strategy responsibility)
const MIN_RISK_PCT = 0.001; // 0.1%
const MAX_RISK_PCT = 0.01;  // 1%

export async function runStructureCheck(
  input: StructureInput
): Promise<StructureSignal | null> {
  const { symbol, candles } = input;

  if (candles.length < LOOKBACK + 2) return null;

  const recent = candles.slice(-LOOKBACK - 1);
  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];

  const highs = recent.slice(0, -1).map((c) => c.high);
  const lows = recent.slice(0, -1).map((c) => c.low);

  const rangeHigh = Math.max(...highs);
  const rangeLow = Math.min(...lows);

  const avgBody =
    recent
      .slice(0, -1)
      .map((c) => Math.abs(c.close - c.open))
      .reduce((a, b) => a + b, 0) / LOOKBACK;

  const lastBody = Math.abs(last.close - last.open);

  /* -------------------------------------------------
     BUY BREAKOUT
  -------------------------------------------------- */
  if (
    last.close > rangeHigh &&
    last.close > prev.close &&
    lastBody >= avgBody * MOMENTUM_MULT
  ) {
    const sl = rangeLow;
    const risk = last.close - sl;
    const riskPct = risk / last.close;

    if (riskPct < MIN_RISK_PCT || riskPct > MAX_RISK_PCT) return null;

    const tp1 = last.close + risk;

    if (!(sl < last.close && tp1 > last.close)) return null;

    return {
      symbol,
      direction: "BUY",
      sl,
      tp1,
      reason: "STRUCTURE_BREAKOUT_UP",
    };
  }

  /* -------------------------------------------------
     SELL BREAKOUT
  -------------------------------------------------- */
  if (
    last.close < rangeLow &&
    last.close < prev.close &&
    lastBody >= avgBody * MOMENTUM_MULT
  ) {
    const sl = rangeHigh;
    const risk = sl - last.close;
    const riskPct = risk / last.close;

    if (riskPct < MIN_RISK_PCT || riskPct > MAX_RISK_PCT) return null;

    const tp1 = last.close - risk;

    if (!(sl > last.close && tp1 < last.close)) return null;

    return {
      symbol,
      direction: "SELL",
      sl,
      tp1,
      reason: "STRUCTURE_BREAKOUT_DOWN",
    };
  }

  return null;
}
