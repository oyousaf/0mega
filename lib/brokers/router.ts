import { BrokerAdapter, Market, PlaceOrderParams } from "./types";
import { logBrokerEvent } from "./logger";
import { getLatency, recordLatency } from "./latency";
import { halaalCheck } from "./halaal";

type BrokerMap = Record<Market, BrokerAdapter[]>;

export class BrokerRouter {
  constructor(private brokers: BrokerMap) {}

  private async pickHealthy(market: Market): Promise<BrokerAdapter> {
    const candidates: BrokerAdapter[] = [];

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
        candidates.push(broker);
      } catch (err: any) {
        logBrokerEvent({
          type: "FAILED",
          market,
          broker: broker.name,
          error: err?.message ?? "healthCheck error",
        });
      }
    }

    if (!candidates.length) {
      throw new Error(`No healthy broker for ${market}`);
    }

    candidates.sort((a, b) => getLatency(a.name) - getLatency(b.name));

    const selected = candidates[0];
    logBrokerEvent({
      type: "SELECTED",
      market,
      broker: selected.name,
    });
    return selected;
  }

  async placeOrder(params: PlaceOrderParams) {
    const reason = halaalCheck({
      market: params.market,
      symbol: params.symbol,
      side: params.side,
      leverage: (params as any).leverage,
      instrumentType: (params as any).instrumentType,
    });

    if (reason) {
      logBrokerEvent({
        type: "FAILED",
        market: params.market,
        broker: "router",
        error: `HALAAL_BLOCK:${reason}`,
      });
      throw new Error(`HALAAL_BLOCK:${reason}`);
    }

    const broker = await this.pickHealthy(params.market);
    const t0 = Date.now();
    try {
      return await broker.placeOrder(params);
    } finally {
      recordLatency(broker.name, Date.now() - t0);
    }
  }

  async fetchBalance(market: Market) {
    const broker = await this.pickHealthy(market);
    const t0 = Date.now();
    try {
      return await broker.fetchBalance();
    } finally {
      recordLatency(broker.name, Date.now() - t0);
    }
  }

  async fetchPositions(market: Market) {
    const broker = await this.pickHealthy(market);
    const t0 = Date.now();
    try {
      return await broker.fetchPositions();
    } finally {
      recordLatency(broker.name, Date.now() - t0);
    }
  }
}
