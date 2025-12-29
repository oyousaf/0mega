import { pool } from "@/lib/neon";
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

export class PaperBroker implements Broker {
  async fetchBalance(): Promise<Balance> {
    const { rows } = await pool.query(
      `SELECT balance FROM paper_balance WHERE id = 1`
    );

    const balance = rows.length ? Number(rows[0].balance) : 100_000;

    return { equity: balance, cash: balance };
  }

  async fetchPositions(): Promise<Position[]> {
    const { rows } = await pool.query(
      `SELECT id, symbol, side, entry_price, qty FROM paper_trades`
    );

    return rows.map((r) => ({
      id: String(r.id),
      symbol: r.symbol,
      side: r.side,
      qty: Number(r.qty),
      avgPrice: Number(r.entry_price),
    }));
  }

  async fetchPrice(symbol: string): Promise<{ price: number } | null> {
    const asset = detectAsset(symbol);
    const price = await getPrice(symbol, asset);
    if (!price || Number.isNaN(price)) return null;
    return { price };
  }

  async placeOrder(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult> {
    const asset = detectAsset(symbol);
    const price = await getPrice(symbol, asset);
    if (!price) return { success: false, error: "PRICE_UNAVAILABLE" };

    const { rows } = await pool.query(
      `
      INSERT INTO paper_trades (symbol, side, entry_price, qty)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [symbol, side, price, qty]
    );

    const tradeId = String(rows[0].id);

    await pool.query(
      `
      INSERT INTO trade_executions (trade_id, side, qty, price, timestamp)
      VALUES ($1, $2, $3, $4, now())
      `,
      [tradeId, side, qty, price]
    );

    return { success: true, orderId: tradeId, price, qty };
  }

  async closeOrder(orderId: string, qty?: number): Promise<ExecutionResult> {
    const { rows } = await pool.query(
      `SELECT symbol, side, qty FROM paper_trades WHERE id = $1`,
      [orderId]
    );

    if (!rows.length) {
      return { success: false, error: "TRADE_NOT_FOUND" };
    }

    const trade = rows[0];
    const asset = detectAsset(trade.symbol);
    const price = await getPrice(trade.symbol, asset);
    if (!price) return { success: false, error: "PRICE_UNAVAILABLE" };

    const closeQty = qty ?? Number(trade.qty);
    const closeSide = opposite(trade.side);

    await pool.query(
      `
      INSERT INTO trade_executions (trade_id, side, qty, price, timestamp)
      VALUES ($1, $2, $3, $4, now())
      `,
      [orderId, closeSide, closeQty, price]
    );

    await pool.query(`DELETE FROM paper_trades WHERE id = $1`, [orderId]);

    return { success: true, orderId, price, qty: closeQty };
  }
}
