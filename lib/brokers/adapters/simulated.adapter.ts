import {
  BrokerAdapter,
  Market,
  PlaceOrderParams,
  NormalisedBalance,
} from "@/lib/brokers/types";
import { applyForexSpread } from "@/lib/engine/risk/applySpread";

type Execution = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  t: number;
};

export class SimulatedBrokerAdapter implements BrokerAdapter {
  name = "simulated";
  market: Market;

  private balance: NormalisedBalance = {
    currency: "USD",
    free: 1_000_000,
    used: 0,
    total: 1_000_000,
  };

  private prices = new Map<string, number>();
  private executions: Execution[] = [];

  constructor(market: Market) {
    this.market = market;
  }

  /* ------------ BrokerAdapter ------------ */

  async connect() {}
  async healthCheck() {
    return true;
  }

  async fetchBalance(): Promise<NormalisedBalance[]> {
    return [this.balance];
  }

  async fetchPositions() {
    return [];
  }

  async placeOrder(params: PlaceOrderParams) {
    let price = this.prices.get(params.symbol);

    if (price == null) {
      throw new Error(`NO_PRICE_FOR_SYMBOL:${params.symbol}`);
    }

    if (params.market === "forex") {
      price = applyForexSpread({
        pair: params.symbol,
        midPrice: price,
        side: params.side,
      });
    }

    const id = crypto.randomUUID();

    this.executions.push({
      id,
      symbol: params.symbol,
      side: params.side,
      qty: params.qty,
      price,
      t: Date.now(),
    });

    return { orderId: id };
  }

  async cancelOrder() {}

  /* ------------ Simulation-only API ------------ */

  setPrice(symbol: string, price: number) {
    this.prices.set(symbol, price);
  }

  getExecutions() {
    return this.executions;
  }
}
