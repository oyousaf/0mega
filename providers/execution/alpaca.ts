import type {
  Broker,
  ExecutionResult,
  Position,
  Balance,
  OrderSide,
} from "./broker.interface";

export class AlpacaBroker implements Broker {
  async placeOrder(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult> {
    throw new Error("AlpacaBroker not wired");
  }

  async closeOrder(tradeId: string, qty?: number): Promise<ExecutionResult> {
    throw new Error("AlpacaBroker not wired");
  }

  async fetchPositions(): Promise<Position[]> {
    return [];
  }

  async fetchBalance(): Promise<Balance> {
    return {
      equity: 0,
      cash: 0,
    };
  }

  async fetchPrice(symbol: string): Promise<{ price: number } | null> {
    // Sprint 20
    return null;
  }
}
