import { BrokerAdapter, Market, PlaceOrderParams } from "@/lib/brokers/types";

export class BinanceAdapter implements BrokerAdapter {
  name = "binance";
  market: Market = "crypto";

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
    // map params → Binance order later
    return { orderId: crypto.randomUUID() };
  }

  async cancelOrder() {}
}
