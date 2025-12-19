import { BrokerAdapter, Market, PlaceOrderParams } from "./types";
import { logBrokerEvent } from "./logger";

type BrokerMap = Record<Market, BrokerAdapter[]>;

export class BrokerRouter {
  constructor(private brokers: BrokerMap) {}

  private async pickHealthy(market: Market): Promise<BrokerAdapter> {
    let lastError = "unknown";
    for (const broker of this.brokers[market]) {
      try {
        const ok = await broker.healthCheck();
        if (!ok) {
          logBrokerEvent({
            type: "SKIPPED",
            market,
            broker: broker.name,
            reason: "healthCheck=false",
          });
          continue;
        }
        logBrokerEvent({
          type: "SELECTED",
          market,
          broker: broker.name,
        });
        return broker;
      } catch (err: any) {
        lastError = err?.message ?? "healthCheck error";
        logBrokerEvent({
          type: "FAILED",
          market,
          broker: broker.name,
          error: lastError,
        });
      }
    }
    throw new Error(`No healthy broker for ${market}. Last=${lastError}`);
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
