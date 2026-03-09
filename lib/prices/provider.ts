import { getCryptoProvider } from "./crypto";
import { getForexProvider } from "./forex";

export type Timeframe = "1m" | "5m" | "15m";

export function getPriceProvider(symbol: string, timeframe: Timeframe) {
  /* crypto */

  if (symbol === "BTCUSDT" || symbol === "ETHUSDT") {
    return getCryptoProvider(symbol, timeframe);
  }

  /* forex */

  if (symbol === "EURUSD" || symbol === "GBPUSD" || symbol === "USDJPY") {
    return getForexProvider(symbol, timeframe);
  }

  throw new Error(`No provider configured for symbol ${symbol}`);
}
