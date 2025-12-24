import { BrokerAdapter, Market, PlaceOrderParams } from "@/lib/brokers/types";

export class SimulatedBrokerAdapter implements BrokerAdapter {
  name = "simulated";
  market: Market;
  private executions: any[] = [];

  constructor(market: Market) {
    this.market = market;
  }

  async connect() {}
  async healthCheck() {
    return true;
  }

  async fetchBalance() {
    return [
      {
        currency: "USD",
        free: 1_000_000,
        used: 0,
        total: 1_000_000,
      },
    ];
  }

  async fetchPositions() {
    return [];
  }

  async placeOrder(params: PlaceOrderParams) {
    const id = crypto.randomUUID();
    this.executions.push({ id, ...params, ts: Date.now() });
    return { orderId: id };
  }

  async cancelOrder() {}

  getExecutions() {
    return this.executions;
  }
}
