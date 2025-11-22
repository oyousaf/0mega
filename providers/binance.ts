export async function getCryptoPrice(symbol: string): Promise<number> {
  const api = process.env.BINANCE_API_KEY;

  if (!api) {
    const seed = symbol.charCodeAt(0) * 17;
    return Number((100 + (seed % 50) + (Math.random() - 0.5) * 3).toFixed(2));
  }

  // TODO: Add live API fetch later
  return 0;
}
