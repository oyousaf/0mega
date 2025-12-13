import type {
  Broker,
  ExecutionResult,
  Position,
  Balance,
  OrderSide,
} from "./broker.interface";

export class AlpacaBroker implements Broker {
  async placeOrder(): Promise<ExecutionResult> {
    throw new Error("AlpacaBroker not wired");
  }

  async closeOrder(): Promise<ExecutionResult> {
    throw new Error("AlpacaBroker not wired");
  }

  async fetchPositions(): Promise<Position[]> {
    throw new Error("AlpacaBroker not wired");
  }

  async fetchBalance(): Promise<Balance> {
    throw new Error("AlpacaBroker not wired");
  }
}
