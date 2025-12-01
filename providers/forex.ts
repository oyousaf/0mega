export async function getForexPrice(pair: string): Promise<number> {
  const formatted = pair.toUpperCase().trim();

  try {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/prices/forex/${formatted}`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Failed to fetch forex price for ${formatted}`);
    }

    const data = await res.json();

    if (data?.price == null || Number.isNaN(Number(data.price))) {
      throw new Error(`No valid forex price returned for ${formatted}`);
    }

    return Number(data.price);
  } catch (err) {
    console.error("getForexPrice error:", err);
    throw err;
  }
}
