import { BrokerAdapter, Market, PlaceOrderParams } from "./types";

type BrokerMap = Record<Market, BrokerAdapter[]>;

export class BrokerRouter {
  constructor(private brokers: BrokerMap) {}

  private async pickHealthy(market: Market): Promise<BrokerAdapter> {
    for (const broker of this.brokers[market]) {
      try {
        const ok = await broker.healthCheck();
        if (ok) return broker;
      } catch {}
    }
    throw new Error(`No healthy broker for ${market}`);
  }

  async placeOrder(params: PlaceOrderParams) {
    const broker = await this.pickHealthy(params.market);
    return broker.placeOrder(params);
  }

  async fetchBalance(market: Market) {
    const broker = await this.pickHealthy(market);
    return broker.fetchBalance();
  }

  async fetchPositions(market: Market) {
    const broker = await this.pickHealthy(market);
    return broker.fetchPositions();
  }
}
