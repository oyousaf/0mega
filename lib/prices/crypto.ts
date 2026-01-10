type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const CACHE: Record<string, Candle[]> = {};
const LAST_ADVANCE: Record<string, number> = {};

export function getCryptoProvider(
  symbol: string,
  timeframe: "1m" | "5m" | "15m"
) {
  const key = `${symbol}:${timeframe}`;

  const tfMs =
    timeframe === "1m" ? 60_000 : timeframe === "5m" ? 300_000 : 900_000;

  return {
    async fetchCandles(): Promise<Candle[]> {
      const now = Date.now();

      if (!CACHE[key]) {
        CACHE[key] = seedCandles(tfMs);
        LAST_ADVANCE[key] = now;
        return CACHE[key];
      }

      // advance ONLY when a full candle duration has elapsed
      if (now - LAST_ADVANCE[key] >= tfMs) {
        advanceCandle(CACHE[key], tfMs);
        LAST_ADVANCE[key] = now;
      }

      return CACHE[key];
    },
  };
}

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

function seedCandles(tfMs: number): Candle[] {
  const now = Date.now();
  let price = 50_000;

  return Array.from({ length: 50 }).map((_, i) => {
    const ts = now - (50 - i) * tfMs;
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

function advanceCandle(candles: Candle[], tfMs: number) {
  const last = candles[candles.length - 1];
  const open = last.close;
  const close = open + randomStep();

  candles.push({
    timestamp: last.timestamp + tfMs,
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
