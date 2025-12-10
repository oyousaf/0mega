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

/**
 * All brokers must implement these five methods.
 * PaperBroker, AlpacaBroker, BinanceBroker will follow this.
 */
export interface Broker {
  openTrade(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult>;

  closeTrade(orderId: string): Promise<ExecutionResult>;

  partialClose(orderId: string, qty: number): Promise<ExecutionResult>;

  getOpenTrades(): Promise<OpenTrade[]>;

  getBalance(): Promise<number>;
}
