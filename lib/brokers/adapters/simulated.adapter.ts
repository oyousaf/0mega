import {
  BrokerAdapter,
  Market,
  PlaceOrderParams,
  NormalisedBalance,
  NormalisedPosition,
} from "@/lib/brokers/types";

/**
 * Simulated broker for BACKTEST mode only.
 * - Deterministic
 * - In-memory
 * - No side effects
 */

type SimTrade = {
  symbol: string;
  qty: number;
  entryPrice: number;
  side: "BUY" | "SELL";
};

export class SimulatedBrokerAdapter implements BrokerAdapter {
  name = "simulated";
  market: Market;

  private cash = 100_000;
  private positions: SimTrade[] = [];
  private lastPrice: Record<string, number> = {};

  constructor(market: Market) {
    this.market = market;
  }

  async connect() {
    return;
  }

  async healthCheck() {
    return true;
  }

  /* ----------------------------
     PRICE INJECTION
     (called by replay loop)
  ---------------------------- */
  setPrice(symbol: string, price: number) {
    this.lastPrice[symbol] = price;
  }

  /* ----------------------------
     BALANCE
  ---------------------------- */
  async fetchBalance(): Promise<NormalisedBalance[]> {
    const equity =
      this.cash +
      this.positions.reduce((sum, p) => {
        const px = this.lastPrice[p.symbol] ?? p.entryPrice;
        return sum + (px - p.entryPrice) * p.qty;
      }, 0);

    return [
      {
        currency: "USD",
        free: this.cash,
        used: equity - this.cash,
        total: equity,
      },
    ];
  }

  /* ----------------------------
     POSITIONS
  ---------------------------- */
  async fetchPositions(): Promise<NormalisedPosition[]> {
    return this.positions.map((p) => ({
      symbol: p.symbol,
      qty: p.qty,
      entryPrice: p.entryPrice,
      unrealisedPnl:
        ((this.lastPrice[p.symbol] ?? p.entryPrice) - p.entryPrice) * p.qty,
    }));
  }

  /* ----------------------------
     PLACE ORDER
  ---------------------------- */
  async placeOrder(params: PlaceOrderParams): Promise<{ orderId: string }> {
    const price = this.lastPrice[params.symbol];

    if (!price) {
      throw new Error("SIM_PRICE_NOT_SET");
    }

    const cost = price * params.qty;

    if (params.side === "BUY") {
      if (this.cash < cost) {
        throw new Error("SIM_INSUFFICIENT_FUNDS");
      }

      this.cash -= cost;
      this.positions.push({
        symbol: params.symbol,
        qty: params.qty,
        entryPrice: price,
        side: "BUY",
      });
    } else {
      // SELL → close FIFO
      let remaining = params.qty;

      this.positions = this.positions.flatMap((p) => {
        if (p.symbol !== params.symbol || remaining <= 0) {
          return [p];
        }

        const closeQty = Math.min(p.qty, remaining);
        remaining -= closeQty;

        this.cash += closeQty * price;

        if (p.qty > closeQty) {
          return [{ ...p, qty: p.qty - closeQty }];
        }

        return [];
      });
    }

    return { orderId: `SIM-${Date.now()}` };
  }

  async cancelOrder() {
    return;
  }
}
