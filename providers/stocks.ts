export async function getStockPrice(symbol: string): Promise<number> {
  const ticker = symbol.toUpperCase().trim();

  const endpoint = `${process.env.NEXT_PUBLIC_APP_URL}/api/prices/stocks/${ticker}`;

  const res = await fetch(endpoint, { cache: "no-store" });

  if (!res.ok) throw new Error(`Failed to fetch stock price for ${ticker}`);

  const data = await res.json();

  if (data?.price == null || Number.isNaN(Number(data.price))) {
    throw new Error(`No valid stock price returned for ${ticker}`);
  }

  return Number(data.price);
}
