export interface Signal {
  id: string;

  symbol: string;
  strategy: string;
  type: "stock" | "crypto" | "forex";
  halaal: boolean;

  entry_price: number | null;
  tp1: number | null;
  tp2: number | null;
  sl: number | null;
  current_price: number | null;

  notes: string;

  // Strict statuses only
  status: "ACTIVE" | "TP1 HIT" | "TP2 HIT" | "SL HIT" | "EXPIRED" | "INVALID";

  created_at: string;
  updated_at: string | null;
}
