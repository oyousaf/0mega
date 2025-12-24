import { BrokerAdapter, Market, PlaceOrderParams } from "@/lib/brokers/types";
import { isUsMarketOpen } from "@/lib/market/usMarketHours";

export class AlpacaAdapter implements BrokerAdapter {
  name = "alpaca";
  market: Market = "equity";

  async connect() {}
  async healthCheck() {
    return true;
  }

  async fetchBalance() {
    return [];
  }

  async fetchPositions() {
    return [];
  }

  async placeOrder(params: PlaceOrderParams) {
    if (!isUsMarketOpen()) {
      throw new Error("US_MARKET_CLOSED");
    }

    return { orderId: crypto.randomUUID() };
  }

  async cancelOrder() {}
}
