export function getForexProvider(symbol: string, timeframe: string) {
  const intervalMap: Record<string, string> = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
  };

  const interval = intervalMap[timeframe];

  return {
    async fetchCandles() {
      const url =
        `https://api.twelvedata.com/time_series` +
        `?symbol=${symbol}` +
        `&interval=${interval}` +
        `&outputsize=300` +
        `&apikey=${process.env.TWELVEDATA_API_KEY}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.values) return [];

      return data.values.reverse().map((c: any) => ({
        timestamp: new Date(c.datetime).getTime(),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        bid: Number(c.close),
        ask: Number(c.close),
      }));
    },
  };
}
