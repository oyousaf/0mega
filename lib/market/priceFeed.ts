import { getBroker } from "@/providers/execution/router";

export async function fetchPrices(
  symbols: string[],
): Promise<Record<string, number>> {
  const broker = getBroker();
  const prices: Record<string, number> = {};

  for (const symbol of symbols) {
    const res = await broker.fetchPrice(symbol);
    if (res?.price) prices[symbol] = res.price;
  }

  return prices;
}
