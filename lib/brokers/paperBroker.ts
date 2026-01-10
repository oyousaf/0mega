export class PaperBroker {
  private lastPrice: number = 50_000;

  async fetchBalance() {
    return { cash: 100_000, equity: 100_000 };
  }

  async fetchPositions() {
    return [];
  }

  /**
   * Price MUST exist.
   * For demo: assume instant fill at last known price.
   */
  async placeOrder(symbol: string, qty: number, side: "BUY" | "SELL") {
    return {
      success: true,
      orderId: `paper-${Date.now()}`,
      price: this.lastPrice,
    };
  }

  /**
   * Allow price injection from price loop
   */
  setPrice(price: number) {
    this.lastPrice = price;
  }

  async closeOrder() {
    return { success: true };
  }
}
