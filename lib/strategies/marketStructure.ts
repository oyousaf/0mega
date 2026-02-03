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

/* FAST DEBUG MODE */
const LOOKBACK = 6;
const MIN_RISK_PCT = 0.00015; // 0.015%
const MAX_RISK_PCT = 0.05; // 5%

export async function runStructureCheck(
  input: StructureInput,
): Promise<StructureSignal | null> {
  const { symbol, candles } = input;
  if (candles.length < LOOKBACK + 1) return null;

  const recent = candles.slice(-LOOKBACK);
  const last = recent.at(-1)!;
  const prev = recent.at(-2)!;

  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);

  const rangeHigh = Math.max(...highs);
  const rangeLow = Math.min(...lows);

  /* BUY momentum */
  if (last.close > prev.close) {
    const sl = rangeLow;
    const risk = last.close - sl;
    const riskPct = risk / last.close;

    if (riskPct >= MIN_RISK_PCT && riskPct <= MAX_RISK_PCT) {
      return {
        symbol,
        direction: "BUY",
        sl,
        tp1: last.close + risk,
        reason: "FAST_MOMENTUM_UP",
      };
    }
  }

  /* SELL momentum */
  if (last.close < prev.close) {
    const sl = rangeHigh;
    const risk = sl - last.close;
    const riskPct = risk / last.close;

    if (riskPct >= MIN_RISK_PCT && riskPct <= MAX_RISK_PCT) {
      return {
        symbol,
        direction: "SELL",
        sl,
        tp1: last.close - risk,
        reason: "FAST_MOMENTUM_DOWN",
      };
    }
  }

  return null;
}
