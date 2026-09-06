import type { Candle } from "@/types/trade";

const cache: Record<string, Candle[]> = {};
const basePrice: Record<string, number> = {};

export function getCryptoProvider(
  symbol: string,
  timeframe: "1m" | "5m" | "15m",
) {
  void timeframe;
  return {
    async fetchCandles(): Promise<Candle[]> {
      if (!cache[symbol]) {
        const start = basePrice[symbol] ?? 50_000;
        basePrice[symbol] = start;
        cache[symbol] = seedCandles(start);
        return cache[symbol];
      }
      advanceCandle(cache[symbol]);
      return cache[symbol];
    },
  };
}

function seedCandles(startPrice: number): Candle[] {
  let price = startPrice;
  const now = Date.now();
  return Array.from({ length: 50 }).map((_, index) => {
    const open = price;
    const close = open + randomStep(open);
    const wick = Math.abs(randomStep(open) * 0.3);
    price = close;
    return {
      timestamp: now - (50 - index) * 1000,
      open,
      high: Math.max(open, close) + wick,
      low: Math.min(open, close) - wick,
      close,
      volume: 1,
    };
  });
}

function advanceCandle(candles: Candle[]) {
  const open = candles[candles.length - 1].close;
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

function randomStep(price: number) {
  return price * ((Math.random() - 0.5) * 0.003);
}
