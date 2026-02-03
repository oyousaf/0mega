import { getCryptoProvider } from "./crypto";

export type Timeframe = "1m" | "5m" | "15m";

export function getPriceProvider(symbol: string, timeframe: Timeframe) {
  return getCryptoProvider(symbol, timeframe);
}
