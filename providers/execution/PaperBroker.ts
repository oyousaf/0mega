import type {
  Broker,
  ExecutionResult,
  Position,
  Balance,
  OrderSide,
} from "./broker.interface";
import { getPrice } from "@/providers";
import { detectAsset } from "@/lib/trading/detectAssetType";

function opposite(side: OrderSide): OrderSide {
  return side === "BUY" ? "SELL" : "BUY";
}

/**
 * PaperBroker
 * -------------------------------------------------
 * - NO database writes
 * - NO trade state
 * - Executes at market price only
 * - executionHelpers is the single source of truth
 */
export class PaperBroker implements Broker {
  async fetchBalance(): Promise<Balance> {
    // Balance truth lives elsewhere (or fixed demo value)
    return { equity: 100_000, cash: 100_000 };
  }

  async fetchPositions(): Promise<Position[]> {
    // Positions are tracked via paper_trades by the engine
    return [];
  }

  async fetchPrice(symbol: string): Promise<{ price: number } | null> {
    const asset = detectAsset(symbol);
    const price = await getPrice(symbol, asset);
    if (!Number.isFinite(price)) return null;
    return { price };
  }

  async placeOrder(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult> {
    const asset = detectAsset(symbol);
    const price = await getPrice(symbol, asset);
    if (!Number.isFinite(price)) {
      return { success: false, error: "PRICE_UNAVAILABLE" };
    }

    return {
      success: true,
      orderId: `paper-${Date.now()}`,
      price,
      qty,
    };
  }

  async closeOrder(orderId: string, qty?: number): Promise<ExecutionResult> {
    return {
      success: true,
      orderId,
      price: NaN,
      qty: qty ?? 0,
    };
  }
}
