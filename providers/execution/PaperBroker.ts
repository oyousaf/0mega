import type {
  Broker,
  ExecutionResult,
  Position,
  Balance,
  OrderSide,
} from "./broker.interface";
import { getPrice } from "@/providers";
import { detectAsset } from "@/lib/trading/detectAssetType";
import { pool } from "@/lib/db";
import { RISK_CONFIG } from "@/lib/trading/config/riskConfig";

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
    const { rows } = await pool.query(`
      SELECT $1::numeric + COALESCE(SUM(realised_pl), 0) AS equity
      FROM paper_trades
      WHERE is_closed = true
    `, [RISK_CONFIG.initialEquity]);
    const equity = Number(rows[0]?.equity ?? RISK_CONFIG.initialEquity);
    return { equity, cash: equity };
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
    side: OrderSide,
    executionPrice?: number,
  ): Promise<ExecutionResult> {
    void side;
    const price = Number.isFinite(executionPrice)
      ? Number(executionPrice)
      : (await this.fetchPrice(symbol))?.price;
    if (!Number.isFinite(price)) {
      return { success: false, error: "PRICE_UNAVAILABLE" };
    }

    return {
      success: true,
      orderId: `paper-${Date.now()}`,
      price: Number(price),
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
