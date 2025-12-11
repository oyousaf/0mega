export interface Trade {
  trade_id: number;
  symbol: string;
  strategy?: string | null;

  trade_side: "LONG" | "SHORT";

  entry_price: number;
  entry_fill_price: number | null;

  exit_fill_price: number | null;
  realised_pl: number | null;

  sl: number | null;

  rr: number | null;

  qty: number;

  opened_at: string;
  closed_at: string | null;

  is_closed: boolean;

  executions: {
    exec_id: number;
    price: number;
    qty: number;
    side: "OPEN" | "CLOSE";
    time: string;
    broker: string | null;
  }[];
}
