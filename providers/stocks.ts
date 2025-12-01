export async function getStockPrice(symbol: string): Promise<number> {
  const upper = symbol.toUpperCase();

  try {
    const endpoint = `${process.env.NEXT_PUBLIC_APP_URL}/api/prices/stocks/${upper}`;

    const res = await fetch(endpoint, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Failed to fetch stock price for ${upper}`);
    }

    const data = await res.json();

    if (data?.price == null || Number.isNaN(Number(data.price))) {
      throw new Error(`No valid price returned for ${upper}`);
    }

    return Number(data.price);
  } catch (err) {
    console.error("getStockPrice error:", err);
    throw err;
  }
}
