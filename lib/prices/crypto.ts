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
 * FAST DEBUG / PAPER MODE
 * - Every fetch advances price
 * - Every poll = new candle
 * - No timeframe gating
 * - Designed to populate DB + validate engine
 */
export function getCryptoProvider(
  symbol: string,
  _timeframe: "1m" | "5m" | "15m",
) {
  return {
    async fetchCandles(): Promise<Candle[]> {
      if (!CACHE[symbol]) {
        const start = BASE_PRICE[symbol] ?? 50_000;
        BASE_PRICE[symbol] = start;
        CACHE[symbol] = seedCandles(start);
        return CACHE[symbol];
      }

      advanceCandle(CACHE[symbol]);
      return CACHE[symbol];
    },
  };
}

/* ---------------------------------------
   Helpers
---------------------------------------- */

function seedCandles(startPrice: number): Candle[] {
  let price = startPrice;
  const now = Date.now();

  return Array.from({ length: 50 }).map((_, i) => {
    const open = price;
    const close = open + randomStep(open);
    const wick = Math.abs(randomStep(open) * 0.3);

    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;

    price = close;

    return {
      timestamp: now - (50 - i) * 1000,
      open,
      high,
      low,
      close,
      volume: 1,
    };
  });
}

function advanceCandle(candles: Candle[]) {
  const last = candles[candles.length - 1];
  const open = last.close;

  const close = open + randomStep(open);
  const wick = Math.abs(randomStep(open) * 0.3);

  candles.push({
    timestamp: Date.now(),
    open,
    high: Math.max(open, close) + wick,
    low: Math.min(open, close) - wick,
    close,
    volume: 1,
  });

  candles.shift();
}

/**
 * ~ ±0.15% per tick
 * Tuned to hit SL/TP regularly
 */
function randomStep(price: number) {
  return price * ((Math.random() - 0.5) * 0.003);
}
