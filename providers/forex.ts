export async function getForexPrice(pair: string): Promise<number> {
  const formatted = pair.toUpperCase().trim();

  const res = await fetch(`/api/prices/forex/${formatted}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Forex price unavailable for ${formatted}`);
  }

  const data = await res.json();

  if (!Number.isFinite(Number(data.price))) {
    throw new Error(`Invalid forex price for ${formatted}`);
  }

  return Number(data.price);
}
