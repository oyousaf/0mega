import { Market } from "./types";

export function normaliseSymbol(raw: string, market: Market): string {
  const s = raw.toUpperCase();

  if (market === "crypto") {
    if (s.endsWith("USDT")) return s.replace("USDT", "-USDT");
    if (s.endsWith("USD")) return s.replace("USD", "-USD");
  }

  if (market === "equity") {
    return s.replace(/[^A-Z]/g, "");
  }

  if (market === "forex") {
    if (s.includes("/")) return s;
    if (s.length === 6) return `${s.slice(0, 3)}/${s.slice(3)}`;
  }

  return s;
}
