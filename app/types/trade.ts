export interface Trade {
  trade_id: string;
  symbol: string;

  side: "LONG" | "SHORT";
  strategy: string;

  entry_price: number;
  entry_fill_price: number | null;

  exit_fill_price: number | null;
  realised_pl: number | null;
  rr: number | null;

  qty: number;

  opened_at: string;
  closed_at: string | null;
  is_closed: boolean;

  executions: {
    id: string;
    signal_id: number;
    price: number;
    qty: number;
    side: string;
    time: string;
    broker: string;
  }[];

  halaal?: boolean; 
}
