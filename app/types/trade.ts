/* -------------------------------------------------
   EXECUTION
-------------------------------------------------- */
export interface TradeExecution {
  exec_id: number;

  trade_id: number;

  side: "BUY" | "SELL";
  qty: number;
  price: number;

  broker: string;
  status: "FILLED" | "FAILED";

  risk_amount: number;
  error: string | null;

  timestamp: string;
}

/* -------------------------------------------------
   TRADE
-------------------------------------------------- */
export interface Trade {
  trade_id: number;

  symbol: string;
  side: "BUY" | "SELL";

  strategy?: string | null;
  entry_price: number;
  sl: number;
  tp1: number | null;

  qty: number;

  rr: number | null;
  risk_amount: number;

  realised_pl: number | null;

  opened_at: string;
  closed_at: string | null;
  is_closed: boolean;
  halaal?: boolean;

  executions: TradeExecution[];
}

/* -------------------------------------------------
   CANDLE
-------------------------------------------------- */
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  bid?: number;
  ask?: number;
}
