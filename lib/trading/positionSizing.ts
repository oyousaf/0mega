import { getPrice } from "@/providers/index";

export async function calcQty(symbol: string, type: string): Promise<number> {
  const NOTIONAL = 100;
  const price = await getPrice(symbol, type);

  return Number((NOTIONAL / price).toFixed(6));
}
