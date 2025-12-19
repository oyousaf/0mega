import {
  BrokerAdapter,
  Market,
  PlaceOrderParams,
} from "./types";

export class PaperBroker implements BrokerAdapter {
  name = "paper";
  market: Market;

  constructor(market: Market) {
    this.market = market;
  }

  async connect() {}

  async healthCheck() {
    return true;
  }

  async fetchBalance() {
    return [
      { currency: "USD", free: 10000, used: 0, total: 10000 },
    ];
  }

  async fetchPositions() {
    return [];
  }

  async placeOrder(params: PlaceOrderParams) {
    return { orderId: `paper-${Date.now()}` };
  }

  async cancelOrder() {}
}
