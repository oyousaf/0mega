export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

type Key = `${string}:${string}:${string}`;

const store = new Map<Key, Candle[]>();

export function putCandles(
  market: string,
  symbol: string,
  tf: string,
  candles: Candle[],
) {
  const key: Key = `${market}:${symbol}:${tf}`;
  store.set(
    key,
    candles.sort((a, b) => a.t - b.t),
  );
}

export function getCandles(
  market: string,
  symbol: string,
  tf: string,
): Candle[] {
  const key: Key = `${market}:${symbol}:${tf}`;
  const data = store.get(key);
  if (!data) throw new Error("CANDLES_NOT_FOUND");
  return data;
}
