import {
  BrokerAdapter,
  Market,
  PlaceOrderParams,
  NormalisedBalance,
} from "@/lib/brokers/types";
import { applyForexSpread } from "@/lib/engine/risk/applySpread";
import { applySlippage } from "@/lib/engine/execution/slippage";
import { computeFee } from "@/lib/engine/execution/fees";

type Execution = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  fee: number;
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

    // 1) Spread (forex only)
    if (params.market === "forex") {
      price = applyForexSpread({
        pair: params.symbol,
        midPrice: price,
        side: params.side,
      });
    }

    // 2) Slippage
    price = applySlippage({
      market: params.market,
      midPrice: price,
      side: params.side,
    });

    // 3) Fee
    const fee = computeFee({
      market: params.market,
      price,
      qty: params.qty,
    });

    const id = crypto.randomUUID();

    this.executions.push({
      id,
      symbol: params.symbol,
      side: params.side,
      qty: params.qty,
      price,
      fee,
      t: Date.now(),
    });

    return { orderId: id };
  }

  async cancelOrder() {}

  /* -------- Simulation-only -------- */

  setPrice(symbol: string, price: number) {
    this.prices.set(symbol, price);
  }

  getExecutions() {
    return this.executions;
  }
}
