export interface TradeExecution {
  exec_id: string;
  price: number;
  qty: number;
  side: "BUY" | "SELL";
  time: string;
  broker: string;
}

export interface Trade {
  trade_id: string;

  symbol: string;
  side: "BUY" | "SELL";

  strategy: string;

  entry_price: number;
  entry_fill_price: number;
  exit_fill_price: number | null;

  realised_pl: number | null;
  rr: number | null;

  qty: number;

  opened_at: string;
  closed_at: string | null;
  is_closed: boolean;

  executions: TradeExecution[];

  halaal: boolean;
}
