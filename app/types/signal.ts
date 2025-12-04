export interface Signal {
  id: number;

  // --- Identity ---
  symbol: string;
  strategy: string;
  type: "stock" | "crypto" | "forex";
  halaal: boolean;

  // --- Pricing ---
  entry_price: number | null;
  exit_price: number | null;
  current_price: number | null;

  tp1: number | null;
  tp2: number | null;
  sl: number | null;

  tp1_hit: boolean;
  tp2_hit: boolean;
  sl_hit: boolean;

  // --- Notes ---
  notes: string;

  // --- Status ---
  status: "ACTIVE" | "TP1 HIT" | "TP2 HIT" | "SL HIT" | "EXPIRED" | "CLOSED";

  // --- Timestamps ---
  created_at: string;
  updated_at: string | null;
}
