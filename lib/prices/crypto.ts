type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const CACHE: Record<string, Candle[]> = {};

export function getCryptoProvider(
  symbol: string,
  timeframe: "1m" | "5m" | "15m"
) {
  const key = `${symbol}:${timeframe}`;

  return {
    async fetchCandles(): Promise<Candle[]> {
      if (!CACHE[key]) {
        CACHE[key] = seedCandles();
      }

      advanceCandle(CACHE[key]);
      return CACHE[key];
    },
  };
}

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

function seedCandles(): Candle[] {
  const now = Date.now();
  let price = 50000;

  return Array.from({ length: 50 }).map((_, i) => {
    const ts = now - (50 - i) * 5 * 60_000;
    const open = price;
    const close = price + randomStep();
    const high = Math.max(open, close) + Math.random() * 20;
    const low = Math.min(open, close) - Math.random() * 20;

    price = close;

    return {
      timestamp: ts,
      open,
      high,
      low,
      close,
      volume: Math.random() * 10,
    };
  });
}

function advanceCandle(candles: Candle[]) {
  const last = candles[candles.length - 1];
  const open = last.close;
  const close = open + randomStep();

  candles.push({
    timestamp: last.timestamp + 5 * 60_000,
    open,
    high: Math.max(open, close) + Math.random() * 10,
    low: Math.min(open, close) - Math.random() * 10,
    close,
    volume: Math.random() * 10,
  });

  candles.shift();
}

function randomStep() {
  return (Math.random() - 0.5) * 200;
}
