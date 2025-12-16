export type OrderSide = "BUY" | "SELL";

export type Balance = {
  equity: number;
  cash: number;
};

export type Position = {
  id: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  avgPrice: number;
};

export type ExecutionResult = {
  success: boolean;
  orderId?: string;
  price?: number;
  qty?: number;
  error?: string;
};

export interface Broker {
  fetchBalance(): Promise<Balance>;
  fetchPositions(): Promise<Position[]>;

  placeOrder(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult>;

  closeOrder(
    orderId: string,
    qty?: number
  ): Promise<ExecutionResult>;
}
