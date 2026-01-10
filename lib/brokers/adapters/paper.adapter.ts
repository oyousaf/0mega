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
    let symbol = params.symbol;

    if (params.market === "forex") {
      assertForexMarketOpen();
      symbol = normaliseForexPair(symbol);
    }

    /**
     * PAPER TRUTH:
     * We must return a price.
     * Use last known price from PaperBroker.
     */
    const res = await this.broker.placeOrder(symbol, params.qty, params.side);

    if (!res.success || !res.orderId || !Number.isFinite(res.price)) {
      throw new Error(res.error ?? "PAPER_ORDER_FAILED");
    }

    return {
      orderId: res.orderId,
      price: res.price,
    };
  }

  async cancelOrder(orderId: string) {
    await this.broker.closeOrder(orderId);
  }
}
