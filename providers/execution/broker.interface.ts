export type OrderSide = "BUY" | "SELL";

export interface ExecutionResult {
  success: boolean;
  message: string;
  orderId?: string;
  filledPrice?: number;
  qty?: number;
}

export interface OpenTrade {
  id: string;
  symbol: string;
  side: OrderSide;
  entryPrice: number;
  qty: number;
  openedAt: string;
}

export interface Broker {
  openTrade(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult>;

  partialClose(orderId: string, qty: number): Promise<ExecutionResult>;

  closeTrade(orderId: string): Promise<ExecutionResult>;

  getOpenTrades(): Promise<OpenTrade[]>;

  getBalance(): Promise<number>;
}
