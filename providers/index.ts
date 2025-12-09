import { getCryptoPrice } from "./crypto";
import { getStockPrice } from "./stocks";
import { getForexPrice } from "./forex";

export async function getPrice(symbol: string, type: string): Promise<number> {
  const clean = symbol.trim().toUpperCase();

  switch (type) {
    case "crypto":
      return getCryptoPrice(clean);

    case "stock":
      return getStockPrice(clean);

    case "forex":
      return getForexPrice(clean);

    default:
      throw new Error(`Unknown asset type: ${type}`);
  }
}
