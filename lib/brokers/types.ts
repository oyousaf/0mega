export type Market = "crypto" | "equity" | "forex";

export type OrderSide = "BUY" | "SELL";

export interface NormalisedBalance {
  currency: string;
  free: number;
  used: number;
  total: number;
}

export interface NormalisedPosition {
  symbol: string;
  qty: number;
  entryPrice: number;
  unrealisedPnl?: number;
}

export interface PlaceOrderParams {
  symbol: string;
  side: OrderSide;
  qty: number;
  price?: number;
  market: Market;
}

export interface BrokerAdapter {
  name: string;
  market: Market;

  connect(): Promise<void>;
  healthCheck(): Promise<boolean>;

  fetchBalance(): Promise<NormalisedBalance[]>;
  fetchPositions(): Promise<NormalisedPosition[]>;

  placeOrder(params: PlaceOrderParams): Promise<{ orderId: string }>;
  cancelOrder(orderId: string): Promise<void>;
}
