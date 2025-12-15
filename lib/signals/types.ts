export type Signal = {
  id: number;
  symbol: string;
  market: "crypto" | "forex" | "stock";
  direction: "BUY" | "SELL";
  entry_price: number;
  tp1?: number;
  tp2?: number;
  sl?: number;
  created_at: string;
  riskPct?: number;
};
