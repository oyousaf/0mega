export interface Signal {
  id: number;

  symbol: string;
  strategy: string | null;

  entry_price: number | null;
  tp1: number | null;
  tp2: number | null;
  sl: number | null;

  notes: string | null;

  type: "stock" | "crypto" | "forex";

  halaal: boolean;

  status:
    | "ACTIVE"
    | "TP1 HIT"
    | "TP2 HIT"
    | "SL HIT"
    | "EXPIRED"
    | "INVALID"
    | string;

  current_price: number | null;

  created_at: string;
  updated_at: string | null;
}
