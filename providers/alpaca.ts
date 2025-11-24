export async function getStockPrice(symbol: string): Promise<number> {
  const key = process.env.ALPACA_KEY;
  const secret = process.env.ALPACA_SECRET;

  // No API credentials → stable deterministic mock price
  if (!key || !secret) {
    const seed = symbol.toUpperCase().charCodeAt(0) * 19;

    // Produce a repeatable base price per symbol
    const base = 150 + (seed % 50);
    const noise = (Math.random() - 0.5) * 0.8;

    return Number((base + noise).toFixed(2));
  }

  // TEMP UNTIL LIVE ALPACA IMPLEMENTATION
  return 200.0;
}
