import { getPriceProvider } from "@/lib/prices/provider";

export async function getForexPrice(pair: string): Promise<number> {
  const formatted = pair.toUpperCase().trim();

  const provider = getPriceProvider(formatted, "1m");

  const candles = await provider.fetchCandles();

  if (!candles.length) {
    throw new Error(`Forex price unavailable for ${formatted}`);
  }

  const price = Number(candles[candles.length - 1].close);

  if (!Number.isFinite(price)) {
    throw new Error(`Invalid forex price for ${formatted}`);
  }

  return price;
}