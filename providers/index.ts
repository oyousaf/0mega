import { getCryptoPrice } from "./binance";
import { getStockPrice } from "./polygon";
import { getForexPrice } from "./forex";

export async function getPrice(symbol: string, type: string): Promise<number> {
  switch (type) {
    case "crypto":
      return getCryptoPrice(symbol);

    case "stock":
      return getStockPrice(symbol);

    case "forex":
      return getForexPrice(symbol);

    default:
      throw new Error(`Unknown asset type: ${type}`);
  }
}
