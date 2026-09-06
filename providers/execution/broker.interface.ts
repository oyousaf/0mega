/* -------------------------------------------------
   Shared Types
-------------------------------------------------- */

export type OrderSide = "BUY" | "SELL";

export type ExecutionResult = {
  success: boolean;
  price?: number;
  orderId?: string;
  qty?: number;
  error?: string;
};

export type Position = {
  id: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  avgPrice: number;
};

export type Balance = {
  equity: number;
  cash: number;
};

/* -------------------------------------------------
   Broker Contract (v1)
-------------------------------------------------- */

export interface Broker {
  /* Orders */
  placeOrder(
    symbol: string,
    qty: number,
    side: OrderSide,
    executionPrice?: number,
  ): Promise<ExecutionResult>;

  closeOrder(tradeId: string, qty?: number): Promise<ExecutionResult>;

  /* State */
  fetchPositions(): Promise<Position[]>;

  fetchBalance(): Promise<Balance>;

  /* Market data */
  fetchPrice(symbol: string): Promise<{ price: number } | null>;
}
