export function detectAsset(symbol: string): "crypto" | "forex" | "stock" {
  const s = symbol.toUpperCase();

  // forex patterns: 6 letters, e.g. EURUSD, GBPJPY
  if (/^[A-Z]{6}$/.test(s)) return "forex";

  // crypto pairs: ends with USDT, BTC, ETH, etc
  if (s.endsWith("USDT") || s.endsWith("BTC") || s.endsWith("ETH")) {
    return "crypto";
  }

  // default → stock
  return "stock";
}
