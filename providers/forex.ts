export async function getForexPrice(pair: string): Promise<number> {
  try {
    const formatted = encodeURIComponent(pair);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/prices/forex/${formatted}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch forex price for ${pair}`);
    }

    const data = await res.json();

    if (!data?.price) {
      throw new Error(`No price returned for ${pair}`);
    }

    return Number(data.price);
  } catch (err) {
    console.error("getForexPrice error:", err);
    throw err;
  }
}
