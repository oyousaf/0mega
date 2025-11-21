// Mock price fetcher. Replace later with live API (Finnhub, AlphaVantage, etc.)
export async function fetchMockPrice(symbol: string): Promise<number> {
  // Stable pseudo-random per symbol to keep reloads consistent
  const seed = Array.from(symbol).reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 150 + (seed % 50);         // base price per symbol
  const delta = (Math.random() - 0.5) * 5; // random short-term move
  return +(base + delta).toFixed(2);
}

/* Example future live version:

export async function fetchLivePrice(symbol: string): Promise<number> {
  const key = process.env.FINNHUB_API_KEY!;
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`);
  const data = await res.json();
  return data.c; // current price
}
*/
