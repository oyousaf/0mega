import { Market } from "./types";

export function halaalCheck(params: {
  market: Market;
  symbol: string;
  leverage?: number;
  instrumentType?: string;
  side?: "BUY" | "SELL";
}): string | null {
  const { market, symbol, leverage, instrumentType, side } = params;
  const s = symbol.toUpperCase();

  if (leverage && leverage > 1) {
    return "LEVERAGE_NOT_ALLOWED";
  }

  if (market === "crypto") {
    if (/(PERP|FUT|SWAP)/.test(s)) return "DERIVATIVE_NOT_ALLOWED";
    if (/UP$|DOWN$/.test(s)) return "LEVERAGED_TOKEN_NOT_ALLOWED";
    return null;
  }

  if (market === "equity") {
    if (side === "SELL") {
      return "EQUITY_SHORTING_NOT_ALLOWED";
    }

    if (instrumentType && instrumentType !== "SPOT") {
      return "EQUITY_NON_SPOT_NOT_ALLOWED";
    }

    const banned = [
      "BANK",
      "ALCOHOL",
      "CASINO",
      "BET",
      "BREW",
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
