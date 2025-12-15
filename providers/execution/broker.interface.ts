export type OrderSide = "BUY" | "SELL";

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  price?: number;
  qty?: number;
  error?: string;
}

export interface Position {
  symbol: string;
  qty: number;
  side: OrderSide;
  avgPrice: number;
}

export interface Balance {
  equity: number;
  cash: number;
}

export interface Broker {
  placeOrder(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult>;

  closeOrder(
    orderId: string,
    qty?: number
  ): Promise<ExecutionResult>;

  fetchPositions(): Promise<Position[]>;
  fetchBalance(): Promise<Balance>;
}
