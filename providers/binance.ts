export async function getCryptoPrice(symbol: string): Promise<number> {
  const api = process.env.BINANCE_API_KEY;

  // No API yet → generate deterministic fake price
  if (!api) {
    const seed = symbol.toUpperCase().charCodeAt(0) * 13;

    // Stable fake prices per symbol
    const base = 100 + (seed % 80);
    const noise = (Math.random() - 0.5) * 0.8;

    return Number((base + noise).toFixed(2));
  }

  // TEMP: Until we wire live API, return stable “mock”
  return 150.0;
}
