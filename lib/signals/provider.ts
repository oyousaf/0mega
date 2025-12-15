import type { Signal } from "./types";

export async function getActiveSignals(): Promise<Signal[]> {
  return [
    {
      id: 1,
      symbol: "BTCUSDT",
      market: "crypto",
      direction: "BUY",
      entry_price: 89000,
      tp1: 90000,
      tp2: 92000,
      sl: 87000,
      created_at: new Date().toISOString(),
      riskPct: 0.01,
    },
  ];
}
