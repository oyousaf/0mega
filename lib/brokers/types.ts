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

// in types.ts (optional)
export interface PlaceOrderParams {
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price?: number;
  market: Market;
  leverage?: number;
  instrumentType?: "SPOT" | "MARGIN" | "FUTURE";
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
