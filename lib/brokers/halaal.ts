import { Market } from "./types";

export function halaalCheck(params: {
  market: Market;
  symbol: string;
  leverage?: number;
  instrumentType?: string;
}): string | null {
  const { market, symbol, leverage, instrumentType } = params;
  const s = symbol.toUpperCase();

  // Global bans
  if (leverage && leverage > 1) {
    return "LEVERAGE_NOT_ALLOWED";
  }

  // CRYPTO rules
  if (market === "crypto") {
    // Ban perpetuals, futures, margin markers
    if (/(PERP|FUT|SWAP)/.test(s)) return "DERIVATIVE_NOT_ALLOWED";
    if (/UP|DOWN$/.test(s)) return "LEVERAGED_TOKEN_NOT_ALLOWED";
    // Spot only
    return null;
  }

  // FOREX rules
  if (market === "forex") {
    // Spot only. No swaps/rollover metadata allowed.
    if (instrumentType && instrumentType !== "SPOT") {
      return "NON_SPOT_FOREX_NOT_ALLOWED";
    }
    return null;
  }

  // EQUITY rules
  if (market === "equity") {
    // Simple blacklist keywords. Extend via DB later.
    const banned = [
      "BANK",
      "ALCOHOL",
      "BREW",
      "CASINO",
      "GAMING",
      "BET",
      "LOAN",
      "CREDIT",
      "INTEREST",
      "TOBACCO",
      "WEAPON",
      "DEFENSE",
    ];
    for (const k of banned) {
      if (s.includes(k)) return `EQUITY_SECTOR_NOT_ALLOWED:${k}`;
    }
    return null;
  }

  return null;
}
