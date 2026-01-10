type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const CACHE: Record<string, Candle[]> = {};
const BASE_PRICE: Record<string, number> = {};

/**
 * Fast demo crypto provider
 * - Advances candle every fetch (high frequency)
 * - Uses % volatility instead of absolute jumps
 * - Produces geometry-safe candles for SL/TP
 */
export function getCryptoProvider(
  symbol: string,
  timeframe: "1m" | "5m" | "15m"
) {
  const key = `${symbol}:${timeframe}`;
  const tfMs =
    timeframe === "1m" ? 60_000 : timeframe === "5m" ? 300_000 : 900_000;

  return {
    async fetchCandles(): Promise<Candle[]> {
      if (!CACHE[key]) {
        const start = BASE_PRICE[symbol] ?? 50_000;
        BASE_PRICE[symbol] = start;
        CACHE[key] = seedCandles(start, tfMs);
        return CACHE[key];
      }

      advanceCandle(CACHE[key], tfMs);
      return CACHE[key];
    },
  };
}

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

function seedCandles(startPrice: number, tfMs: number): Candle[] {
  const now = Date.now();
  let price = startPrice;

  return Array.from({ length: 50 }).map((_, i) => {
    const ts = now - (50 - i) * tfMs;
    const open = price;
    const close = open + randomStep(open);
    const high = Math.max(open, close) + Math.abs(randomStep(open) * 0.25);
    const low = Math.min(open, close) - Math.abs(randomStep(open) * 0.25);

    price = close;

    return {
      timestamp: ts,
      open,
      high,
      low,
      close,
      volume: 1 + Math.random() * 5,
    };
  });
}

function advanceCandle(candles: Candle[], tfMs: number) {
  const last = candles[candles.length - 1];
  const open = last.close;

  const close = open + randomStep(open);
  const wick = Math.abs(randomStep(open) * 0.25);

  candles.push({
    timestamp: last.timestamp + tfMs,
    open,
    high: Math.max(open, close) + wick,
    low: Math.min(open, close) - wick,
    close,
    volume: 1 + Math.random() * 5,
  });

  candles.shift();
}

/**
 * Percentage-based volatility
 * ~ ±0.05% per candle
 */
function randomStep(price: number) {
  return price * ((Math.random() - 0.5) * 0.001);
}
