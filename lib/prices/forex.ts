import type { Candle } from "@/types/trade";

let cachedCandles: Candle[] = [];
let lastFetchMinute = 0;

export function getForexProvider(symbol: string, timeframe: string) {
  const intervalMap: Record<string, string> = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
  };

  const interval = intervalMap[timeframe];

  const symbolMap: Record<string, string> = {
    EURUSD: "EUR/USD",
    GBPUSD: "GBP/USD",
    USDJPY: "USD/JPY",
  };

  const apiSymbol = symbolMap[symbol] ?? symbol;

  return {
    async fetchCandles(): Promise<Candle[]> {
      const currentMinute = Math.floor(Date.now() / 60000);

      /* CACHE HIT */

      if (currentMinute === lastFetchMinute && cachedCandles.length) {
        return cachedCandles;
      }

      try {
        const url =
          `https://api.twelvedata.com/time_series` +
          `?symbol=${apiSymbol}` +
          `&interval=${interval}` +
          `&outputsize=300` +
          `&apikey=${process.env.TWELVE_DATA_API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.code) {
          console.error("[FOREX_PROVIDER_ERROR]", data);
          return cachedCandles;
        }

        if (!data.values) {
          console.log("[FOREX_PROVIDER] no values");
          return cachedCandles;
        }

        const candles: Candle[] = data.values.reverse().map((c: any) => ({
          timestamp: new Date(c.datetime).getTime(),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),

          bid: Number(c.close),
          ask: Number(c.close),

          volume: c.volume ? Number(c.volume) : 0,
        }));

        cachedCandles = candles;
        lastFetchMinute = currentMinute;

        return candles;
      } catch (err) {
        console.error("[FOREX_PROVIDER_FETCH_ERROR]", err);

        return cachedCandles;
      }
    },
  };
}
