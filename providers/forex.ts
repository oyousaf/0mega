export async function getForexPrice(pair: string): Promise<number> {
  const key = process.env.FOREX_API_KEY;

  if (!key) {
    const seed = pair.charCodeAt(0) * 13;
    return Number((1 + (seed % 0.5) + (Math.random() - 0.5) * 0.01).toFixed(5));
  }

  // TODO: Add live forex fetch
  return 0;
}
