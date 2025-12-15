export type Market = "crypto" | "forex" | "stock";

export type Signal = {
  id: number;
  symbol: string;
  market: Market;
  direction: "BUY" | "SELL";
  entry_price: number;
  tp1?: number;
  tp2?: number;
  sl?: number;
  riskPct?: number;
  created_at: string;
};

export type TradeIntent =
  | { type: "OPEN" }
  | { type: "TP1_PARTIAL" }
  | { type: "TP2_CLOSE" }
  | { type: "SL_CLOSE" }
  | { type: "EXPIRED_CLOSE" };
