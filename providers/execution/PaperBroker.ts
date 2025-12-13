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

export class PaperBroker implements Broker {
  /* ----------------------------
     BALANCE (read-only)
  ---------------------------- */
  async fetchBalance(): Promise<Balance> {
    const { rows } = await pool.query(
      `SELECT balance FROM paper_balance WHERE id = 1`
    );

    if (!rows.length) {
      return { equity: 0, cash: 0 };
    }

    const balance = Number(rows[0].balance);

    return {
      equity: balance,
      cash: balance,
    };
  }

  /* ----------------------------
     POSITIONS
  ---------------------------- */
  async fetchPositions(): Promise<Position[]> {
    const { rows } = await pool.query(
      `SELECT symbol, side, entry_price, qty FROM paper_trades`
    );

    return rows.map((r) => ({
      symbol: r.symbol,
      side: r.side,
      qty: Number(r.qty),
      avgPrice: Number(r.entry_price),
    }));
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
      INSERT INTO trade_executions (trade_id, action, qty, price)
      VALUES ($1, 'open', $2, $3)
      `,
      [tradeId, qty, price]
    );

    return {
      success: true,
      orderId: tradeId,
      price,
      qty,
    };
  }

  /* ----------------------------
     CLOSE ORDER (FULL OR PARTIAL)
  ---------------------------- */
  async closeOrder(
    orderId: string,
    qty?: number
  ): Promise<ExecutionResult> {
    const { rows } = await pool.query(
      `SELECT * FROM paper_trades WHERE id = $1`,
      [orderId]
    );

    if (!rows.length) {
      return { success: false, error: "Trade not found" };
    }

    const trade = rows[0];
    const asset = detectAsset(trade.symbol);
    const price = await getPrice(trade.symbol, asset);

    const closeQty = qty ?? Number(trade.qty);

    await pool.query(
      `
      INSERT INTO trade_executions (trade_id, action, qty, price)
      VALUES ($1, 'close', $2, $3)
      `,
      [orderId, closeQty, price]
    );

    if (qty && closeQty < trade.qty) {
      await pool.query(
        `UPDATE paper_trades SET qty = qty - $1 WHERE id = $2`,
        [closeQty, orderId]
      );
    } else {
      await pool.query(`DELETE FROM paper_trades WHERE id = $1`, [orderId]);
    }

    return {
      success: true,
      orderId,
      price,
      qty: closeQty,
    };
  }
}
