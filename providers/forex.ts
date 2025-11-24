export async function getForexPrice(pair: string): Promise<number> {
  const key = process.env.FOREX_API_KEY;

  // No API key → stable deterministic mock price
  if (!key) {
    const p = pair.toUpperCase();
    const seed = p.charCodeAt(0) * 23 + p.charCodeAt(1) * 7;

    // Base FX range
    const base = 1.05 + (seed % 0.20);

    // Tiny noise to allow engine movement without flicker
    const noise = (Math.random() - 0.5) * 0.002;

    return Number((base + noise).toFixed(5));
  }

  // TEMP: Until we wire live API, return stable “mock”
  return 1.12345;
}
