import crypto from "crypto";

import {
  BrokerAdapter,
  Market,
  PlaceOrderParams,
  NormalisedBalance,
} from "@/lib/brokers/types";

import { applySpread } from "@/lib/engine/risk/applySpread";
import { applySlippage } from "@/lib/engine/execution/slippage";
import { computeFee } from "@/lib/engine/execution/fees";

/* ---------------------------------------------
   TYPES
---------------------------------------------- */
type Execution = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  fee: number;
  t: number;
};

/* ---------------------------------------------
   SIMULATED BROKER
---------------------------------------------- */
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
  private lastPrices = new Map<string, number>();
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
    const mid = this.prices.get(params.symbol);
    if (mid == null) {
      throw new Error(`NO_PRICE_FOR_SYMBOL:${params.symbol}`);
    }

    const prev = this.lastPrices.get(params.symbol);

    // Spread
    let price = applySpread({
      market: params.market,
      pair: params.symbol,
      midPrice: mid,
      prevPrice: prev,
      side: params.side,
    });

    // Slippage
    price = applySlippage({
      market: params.market,
      midPrice: price,
      side: params.side,
    });

    // Fees
    const fee = computeFee({
      market: params.market,
      price,
      qty: params.qty,
    });

    this.lastPrices.set(params.symbol, mid);

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

  /* ---------------------------------------------
     SIMULATION HELPERS
  ---------------------------------------------- */
  setPrice(symbol: string, price: number) {
    this.prices.set(symbol, price);
  }

  getPrice(symbol: string): number | null {
    return this.prices.get(symbol) ?? null;
  }

  getExecutions() {
    return this.executions;
  }
}
