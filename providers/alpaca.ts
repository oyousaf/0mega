export async function getStockPrice(symbol: string): Promise<number> {
  const key = process.env.ALPACA_KEY;
  const secret = process.env.ALPACA_SECRET;

  if (!key || !secret) {
    const seed = symbol.charCodeAt(0) * 19;
    return Number((150 + (seed % 40) + (Math.random() - 0.5) * 3).toFixed(2));
  }

  // TODO: Add live Alpaca fetch
  return 0;
}
