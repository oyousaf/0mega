import type {
  Broker,
  ExecutionResult,
  Position,
  Balance,
  OrderSide,
} from "./broker.interface";
import { getPrice } from "@/providers";
import { detectAsset } from "@/lib/trading/detectAssetType";

/**
 * Sprint 16 PaperBroker
 * ----------------------------------
 * • NO database writes
 * • NO trade_executions inserts
 * • NO paper_trades inserts
 * • Engine owns persistence
 */
export class PaperBroker implements Broker {
  /* ----------------------------
     BALANCE (stub)
  ---------------------------- */
  async fetchBalance(): Promise<Balance> {
    return {
      equity: 100_000,
      cash: 100_000,
    };
  }

  /* ----------------------------
     POSITIONS (stub)
  ---------------------------- */
  async fetchPositions(): Promise<Position[]> {
    return [];
  }

  /* ----------------------------
     OPEN ORDER
  ---------------------------- */
  async placeOrder(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult> {
    const asset = detectAsset(symbol);
    const price = await getPrice(symbol, asset);

    return {
      success: true,
      orderId: crypto.randomUUID(),
      price,
      qty,
    };
  }

  /* ----------------------------
     CLOSE ORDER
  ---------------------------- */
  async closeOrder(
    orderId: string,
    qty?: number
  ): Promise<ExecutionResult> {
    return {
      success: true,
      orderId,
      price: undefined,
      qty,
    };
  }
}
