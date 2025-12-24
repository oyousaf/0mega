import { BrokerAdapter, Market, PlaceOrderParams } from "@/lib/brokers/types";
import { PaperBroker } from "@/providers/execution/PaperBroker";
import { assertForexMarketOpen, normaliseForexPair } from "@/lib/market/forex";

export class PaperBrokerAdapter implements BrokerAdapter {
  name = "paper";
  market: Market;
  private broker = new PaperBroker();

  constructor(market: Market) {
    this.market = market;
  }

  async connect() {}
  async healthCheck() {
    return true;
  }

  async fetchBalance() {
    const b = await this.broker.fetchBalance();
    return [
      {
        currency: "USD",
        free: b.cash,
        used: b.equity - b.cash,
        total: b.equity,
      },
    ];
  }

  async fetchPositions() {
    const positions = await this.broker.fetchPositions();
    return positions.map((p) => ({
      symbol: p.symbol,
      qty: p.qty,
      entryPrice: p.avgPrice,
    }));
  }

  async placeOrder(params: PlaceOrderParams) {
    if (params.market === "forex") {
      assertForexMarketOpen();
      params.symbol = normaliseForexPair(params.symbol);
    }

    const res = await this.broker.placeOrder(
      params.symbol,
      params.qty,
      params.side
    );

    if (!res.success || !res.orderId) {
      throw new Error(res.error ?? "PAPER_ORDER_FAILED");
    }

    return { orderId: res.orderId };
  }

  async cancelOrder(orderId: string) {
    await this.broker.closeOrder(orderId);
  }
}
