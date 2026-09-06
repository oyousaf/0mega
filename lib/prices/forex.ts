import type { Candle } from "@/types/trade";

type CacheEntry = {
  candles: Candle[];
  lastFetchMinute: number;
};

type TwelveDataCandle = {
  datetime?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
  volume?: unknown;
};

type TwelveDataResponse = {
  code?: unknown;
  message?: unknown;
  values?: unknown;
};

const CACHE = new Map<string, CacheEntry>();

function parseUtcTimestamp(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return Number.NaN;
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(text) ? text : `${text}Z`).getTime();
}

export function getForexProvider(symbol: string, timeframe: string) {
  const intervalMap: Record<string, string> = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
  };

  const interval = intervalMap[timeframe];
  const intervalMs = Number.parseInt(timeframe, 10) * 60_000;

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
          `&timezone=UTC` +
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

        let data: TwelveDataResponse;

        try {
          data = JSON.parse(text) as TwelveDataResponse;
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

        const completedBefore = Date.now() - 2_000;
        const candles: Candle[] = (data.values as TwelveDataCandle[])
          .map((c) => ({
            timestamp: parseUtcTimestamp(c.datetime),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
            volume: c.volume ? Number(c.volume) : 0,
          }))
          .filter(
            (c) =>
              Number.isFinite(c.timestamp) &&
              Number.isFinite(c.open) &&
              Number.isFinite(c.high) &&
              Number.isFinite(c.low) &&
              Number.isFinite(c.close) &&
              c.high >= c.low &&
              c.timestamp + intervalMs <= completedBefore,
          )
          .sort((a, b) => a.timestamp - b.timestamp);

        CACHE.set(cacheKey, {
          candles,
          lastFetchMinute: currentMinute,
        });

        return candles;
      } catch (err: unknown) {
        console.warn("[FOREX_PROVIDER_FETCH_ERROR]", {
          symbol: apiSymbol,
          message: err instanceof Error ? err.message : "Unknown fetch error",
        });

        return cached?.candles ?? [];
      }
    },
  };
}
