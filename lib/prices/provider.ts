import { getCryptoProvider } from "./crypto";
import { getForexProvider } from "./forex";

export type Timeframe = "1m" | "5m" | "15m";

export function getPriceProvider(symbol: string, timeframe: Timeframe) {
  /* ---------------------------------
     CRYPTO
  ---------------------------------- */

  if (symbol === "BTCUSDT" || symbol === "ETHUSDT") {
    return getCryptoProvider(symbol, timeframe);
  }

  /* ---------------------------------
     FOREX
  ---------------------------------- */

  if (symbol === "EURUSD" || symbol === "GBPUSD" || symbol === "USDJPY") {
    return getForexProvider(symbol, timeframe);
  }

  /* ---------------------------------
     UNKNOWN SYMBOL
  ---------------------------------- */

  throw new Error(
    `[PRICE_PROVIDER] No provider configured for symbol: ${symbol}`,
  );
}
