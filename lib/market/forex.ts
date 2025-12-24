export function normaliseForexPair(raw: string) {
  const p = raw.toUpperCase().trim();
  if (p.includes("/")) return p;
  if (p.length === 6) return `${p.slice(0, 3)}/${p.slice(3)}`;
  throw new Error(`Invalid forex pair: ${raw}`);
}

export function getPipMeta(pair: string) {
  const clean = pair.replace("/", "");
  const isJPY = clean.endsWith("JPY");

  return {
    pipDecimals: isJPY ? 3 : 5,
    pipValue: isJPY ? 0.01 : 0.0001,
  };
}

export function assertForexMarketOpen() {
  const day = new Date().getUTCDay();
  if (day === 0 || day === 6) {
    throw new Error("FOREX_MARKET_CLOSED");
  }
}
