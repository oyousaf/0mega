import type { Candle } from "@/types/trade";

type CacheEntry = {
  candles: Candle[];
  lastFetchMinute: number;
};

const CACHE = new Map<string, CacheEntry>();

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
    XAUUSD: "XAU/USD",
  };

  const apiSymbol = symbolMap[symbol] ?? symbol;

  const cacheKey = `${symbol}_${timeframe}`;

  return {
    async fetchCandles(): Promise<Candle[]> {
      const currentMinute = Math.floor(Date.now() / 60000);

      const cached = CACHE.get(cacheKey);

      if (
        cached &&
        cached.lastFetchMinute === currentMinute &&
        cached.candles.length
      ) {
        return cached.candles;
      }

      try {
        const url =
          `https://api.twelvedata.com/time_series` +
          `?symbol=${apiSymbol}` +
          `&interval=${interval}` +
          `&outputsize=250` +
          `&apikey=${process.env.TWELVE_DATA_API_KEY}`;

        const res = await fetch(url, {
          signal: AbortSignal.timeout(10000),
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          console.warn("[FOREX_PROVIDER_HTTP_ERROR]", {
            symbol: apiSymbol,
            status: res.status,
            statusText: res.statusText,
          });

          return cached?.candles ?? [];
        }

        const text = await res.text();

        let data: any;

        try {
          data = JSON.parse(text);
        } catch {
          console.warn("[FOREX_PROVIDER_INVALID_JSON]", {
            symbol: apiSymbol,
            preview: text.slice(0, 120),
          });

          return cached?.candles ?? [];
        }

        if (data.code) {
          console.warn("[FOREX_PROVIDER_API_ERROR]", {
            symbol: apiSymbol,
            code: data.code,
            message: data.message,
          });

          return cached?.candles ?? [];
        }

        if (!Array.isArray(data.values)) {
          console.warn("[FOREX_PROVIDER_NO_VALUES]", {
            symbol: apiSymbol,
          });

          return cached?.candles ?? [];
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

        CACHE.set(cacheKey, {
          candles,
          lastFetchMinute: currentMinute,
        });

        return candles;
      } catch (err: any) {
        console.warn("[FOREX_PROVIDER_FETCH_ERROR]", {
          symbol: apiSymbol,
          message: err?.message,
        });

        return cached?.candles ?? [];
      }
    },
  };
}
