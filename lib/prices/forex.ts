import type { Candle } from "@/types/trade";

/* -------------------------------------------------
TYPES
-------------------------------------------------- */

type SupportedTimeframe = "1m" | "5m" | "15m";

type CacheEntry = {
  candles: Candle[];
  lastFetchBucket: number;
  lastSuccessfulFetchAt: number;
};

type PolygonAggregate = {
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  t?: number;
  v?: number;
  n?: number;
  vw?: number;
};

type PolygonAggregateResponse = {
  ticker?: string;
  status?: string;
  request_id?: string;
  queryCount?: number;
  resultsCount?: number;
  adjusted?: boolean;
  results?: PolygonAggregate[];
  error?: string;
  message?: string;
};

/* -------------------------------------------------
CONFIG
-------------------------------------------------- */

const POLYGON_BASE_URL = "https://api.polygon.io";

const REQUEST_TIMEOUT_MS = 15_000;

/*
Fetch enough historical bars for:

- EMA 200
- regime windows
- structure lookbacks
- weekends / sparse quote periods

Polygon may omit intervals with no quote updates, so a wider date
window is safer than requesting only the current day.
*/
const LOOKBACK_DAYS = 4;

const MAX_RESULTS = 5_000;

/*
The engine currently checks for fresh data every two minutes when no
trade is open, and every minute while managing an open trade.

This cache prevents duplicate requests within the same UTC minute.
*/
const CACHE_BUCKET_MS = 60_000;

const CACHE = new Map<string, CacheEntry>();

/* -------------------------------------------------
SYMBOL MAPPING
-------------------------------------------------- */

const SYMBOL_MAP: Record<string, string> = {
  EURUSD: "C:EURUSD",
  GBPUSD: "C:GBPUSD",
  USDJPY: "C:USDJPY",
  XAUUSD: "C:XAUUSD",
};

/* -------------------------------------------------
TIMEFRAME MAPPING
-------------------------------------------------- */

const TIMEFRAME_MAP: Record<
  SupportedTimeframe,
  {
    multiplier: number;
    timespan: "minute";
  }
> = {
  "1m": {
    multiplier: 1,
    timespan: "minute",
  },

  "5m": {
    multiplier: 5,
    timespan: "minute",
  },

  "15m": {
    multiplier: 15,
    timespan: "minute",
  },
};

/* -------------------------------------------------
UTILS
-------------------------------------------------- */

function currentCacheBucket() {
  return Math.floor(Date.now() / CACHE_BUCKET_MS);
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateRange() {
  const to = new Date();

  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - LOOKBACK_DAYS);

  return {
    from: formatUtcDate(from),
    to: formatUtcDate(to),
  };
}

function safeNumber(value: unknown): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function isValidCandle(candle: Candle) {
  const timestamp = safeNumber(candle.timestamp);
  const open = safeNumber(candle.open);
  const high = safeNumber(candle.high);
  const low = safeNumber(candle.low);
  const close = safeNumber(candle.close);

  if (
    timestamp === null ||
    open === null ||
    high === null ||
    low === null ||
    close === null
  ) {
    return false;
  }

  if (timestamp <= 0 || open <= 0 || high <= 0 || low <= 0 || close <= 0) {
    return false;
  }

  if (high < low) {
    return false;
  }

  if (open > high || open < low || close > high || close < low) {
    return false;
  }

  return true;
}

function parsePolygonCandles(
  results: PolygonAggregate[],
  symbol: string,
): Candle[] {
  const candles: Candle[] = [];

  for (const aggregate of results) {
    const timestamp = safeNumber(aggregate.t);
    const open = safeNumber(aggregate.o);
    const high = safeNumber(aggregate.h);
    const low = safeNumber(aggregate.l);
    const close = safeNumber(aggregate.c);
    const volume = safeNumber(aggregate.v) ?? 0;

    if (
      timestamp === null ||
      open === null ||
      high === null ||
      low === null ||
      close === null
    ) {
      continue;
    }

    const candle = {
      symbol,
      timestamp,
      open,
      high,
      low,
      close,

      /*
      Polygon aggregate bars do not expose separate candle-level bid
      and ask values.

      Keep both equal to close for now so the existing Candle contract
      remains intact. The spread filter therefore remains neutral until
      quote-based spread modelling is added in the broker-reality sprint.
      */
      bid: close,
      ask: close,

      volume,
    } as Candle;

    if (isValidCandle(candle)) {
      candles.push(candle);
    }
  }

  /*
  Polygon may return descending or ascending data depending on query
  parameters. Sorting here guarantees oldest -> newest for indicators.
  */
  candles.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  /*
  Remove duplicate timestamps defensively.
  */
  const unique = new Map<number, Candle>();

  for (const candle of candles) {
    unique.set(Number(candle.timestamp), candle);
  }

  return [...unique.values()];
}

function cachedCandles(cacheKey: string): Candle[] {
  return CACHE.get(cacheKey)?.candles ?? [];
}

function validateConfiguration(symbol: string, timeframe: string) {
  const apiSymbol = SYMBOL_MAP[symbol];

  if (!apiSymbol) {
    throw new Error(`[FOREX_PROVIDER] Unsupported symbol: ${symbol}`);
  }

  const timeframeConfig = TIMEFRAME_MAP[timeframe as SupportedTimeframe];

  if (!timeframeConfig) {
    throw new Error(`[FOREX_PROVIDER] Unsupported timeframe: ${timeframe}`);
  }

  return {
    apiSymbol,
    timeframeConfig,
  };
}

/* -------------------------------------------------
PROVIDER
-------------------------------------------------- */

export function getForexProvider(symbol: string, timeframe: string) {
  const { apiSymbol, timeframeConfig } = validateConfiguration(
    symbol,
    timeframe,
  );

  const cacheKey = `${apiSymbol}_${timeframe}`;

  return {
    async fetchCandles(): Promise<Candle[]> {
      const apiKey = process.env.POLYGON_API_KEY;

      if (!apiKey) {
        console.error("[FOREX_PROVIDER_CONFIG_ERROR]", {
          symbol,
          message: "POLYGON_API_KEY is missing",
        });

        return cachedCandles(cacheKey);
      }

      const bucket = currentCacheBucket();
      const cached = CACHE.get(cacheKey);

      if (
        cached &&
        cached.lastFetchBucket === bucket &&
        cached.candles.length > 0
      ) {
        return cached.candles;
      }

      const { from, to } = buildDateRange();

      const url =
        `${POLYGON_BASE_URL}` +
        `/v2/aggs/ticker/${encodeURIComponent(apiSymbol)}` +
        `/range/${timeframeConfig.multiplier}` +
        `/${timeframeConfig.timespan}` +
        `/${from}/${to}` +
        `?adjusted=true` +
        `&sort=asc` +
        `&limit=${MAX_RESULTS}` +
        `&apiKey=${encodeURIComponent(apiKey)}`;

      try {
        const response = await fetch(url, {
          cache: "no-store",

          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),

          headers: {
            Accept: "application/json",
            "User-Agent": "Omega-Trading-Engine/1.0",
          },
        });

        const responseText = await response.text();

        if (!response.ok) {
          console.warn("[FOREX_PROVIDER_HTTP_ERROR]", {
            symbol,
            apiSymbol,
            timeframe,
            status: response.status,
            statusText: response.statusText,
            preview: responseText.slice(0, 200),
          });

          return cachedCandles(cacheKey);
        }

        let data: PolygonAggregateResponse;

        try {
          data = JSON.parse(responseText) as PolygonAggregateResponse;
        } catch {
          console.warn("[FOREX_PROVIDER_INVALID_JSON]", {
            symbol,
            apiSymbol,
            timeframe,
            preview: responseText.slice(0, 200),
          });

          return cachedCandles(cacheKey);
        }

        if (data.status === "ERROR" || data.error || data.message) {
          console.warn("[FOREX_PROVIDER_API_ERROR]", {
            symbol,
            apiSymbol,
            timeframe,
            status: data.status,
            error: data.error,
            message: data.message,
            requestId: data.request_id,
          });

          return cachedCandles(cacheKey);
        }

        if (!Array.isArray(data.results)) {
          console.warn("[FOREX_PROVIDER_NO_RESULTS]", {
            symbol,
            apiSymbol,
            timeframe,
            status: data.status,
            resultsCount: data.resultsCount,
            requestId: data.request_id,
          });

          return cachedCandles(cacheKey);
        }

        const candles = parsePolygonCandles(data.results, symbol);

        if (!candles.length) {
          console.warn("[FOREX_PROVIDER_NO_VALID_CANDLES]", {
            symbol,
            apiSymbol,
            timeframe,
            rawResults: data.results.length,
            requestId: data.request_id,
          });

          return cachedCandles(cacheKey);
        }

        CACHE.set(cacheKey, {
          candles,
          lastFetchBucket: bucket,
          lastSuccessfulFetchAt: Date.now(),
        });

        const latest = candles[candles.length - 1];

        console.log("[FOREX_PROVIDER_UPDATED]", {
          symbol,
          apiSymbol,
          timeframe,
          providerStatus: data.status,
          candles: candles.length,
          latestTimestamp: new Date(Number(latest.timestamp)).toISOString(),
          latestClose: Number(latest.close),
        });

        return candles;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        console.warn("[FOREX_PROVIDER_FETCH_ERROR]", {
          symbol,
          apiSymbol,
          timeframe,
          message,
          usingCachedCandles: cachedCandles(cacheKey).length,
        });

        return cachedCandles(cacheKey);
      }
    },
  };
}
