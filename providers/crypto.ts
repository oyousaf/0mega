export async function getCryptoPrice(symbol: string): Promise<number> {
  const upper = symbol.toUpperCase();

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/prices/crypto/${upper}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch crypto price for ${upper}`);
    }

    const data = await res.json();

    if (!data?.price) {
      throw new Error(`No price returned for ${upper}`);
    }

    return Number(data.price);
  } catch (err) {
    console.error("getCryptoPrice error:", err);
    throw err;
  }
}
