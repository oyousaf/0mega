import { pool } from "@/lib/neon";
import type {
  Broker,
  ExecutionResult,
  OpenTrade,
  OrderSide,
} from "./broker.interface";
import { getPrice } from "@/providers/index";

/* ----------------------------------------
   Balance helpers (DB-backed)
---------------------------------------- */
async function getBalanceDB(): Promise<number> {
  const { rows } = await pool.query(`
    SELECT balance FROM paper_balance WHERE id = 1
  `);

  if (rows.length === 0) {
    await pool.query(`
      INSERT INTO paper_balance (id, balance)
      VALUES (1, 100000)
    `);
    return 100000;
  }

  return Number(rows[0].balance);
}

async function setBalanceDB(balance: number) {
  await pool.query(
    `UPDATE paper_balance SET balance = $1 WHERE id = 1`,
    [balance]
  );
}

/* ----------------------------------------
   PaperBroker (DB-backed)
---------------------------------------- */
export class PaperBroker implements Broker {
  /* ----------------------
       BALANCE
  ---------------------- */
  async getBalance(): Promise<number> {
    return getBalanceDB();
  }

  /* ----------------------
       OPEN TRADES
  ---------------------- */
  async getOpenTrades(): Promise<OpenTrade[]> {
    const { rows } = await pool.query(
      `SELECT * FROM paper_trades ORDER BY opened_at DESC`
    );

    return rows.map((r) => ({
      id: String(r.id),
      symbol: r.symbol,
      side: r.side,
      entryPrice: Number(r.entry_price),
      qty: Number(r.qty),
      openedAt: r.opened_at,
    }));
  }

  /* ----------------------
       OPEN TRADE
  ---------------------- */
  async openTrade(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult> {
    const price = await getPrice(symbol, "crypto");
    const cost = price * qty;

    const balance = await getBalanceDB();

    // BUY requires balance
    if (side === "BUY" && cost > balance) {
      return { success: false, message: "Insufficient paper balance" };
    }

    // Deduct balance for BUY
    if (side === "BUY") {
      await setBalanceDB(balance - cost);
    }

    // Insert into DB
    const { rows } = await pool.query(
      `
      INSERT INTO paper_trades (symbol, side, entry_price, qty)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
      [symbol, side, price, qty]
    );

    const tradeId = String(rows[0].id);

    // Log execution
    await pool.query(
      `
      INSERT INTO trade_executions (trade_id, action, qty, price)
      VALUES ($1, 'open', $2, $3)
    `,
      [tradeId, qty, price]
    );

    return {
      success: true,
      message: `${side} trade opened`,
      orderId: tradeId,
      filledPrice: price,
      qty,
    };
  }

  /* ----------------------
       PARTIAL CLOSE
  ---------------------- */
  async partialClose(orderId: string, qty: number): Promise<ExecutionResult> {
    const { rows } = await pool.query(
      `SELECT * FROM paper_trades WHERE id = $1`,
      [orderId]
    );

    if (rows.length === 0) {
      return { success: false, message: "Trade not found" };
    }

    const trade = rows[0];
    const price = await getPrice(trade.symbol, "crypto");
    const entry = Number(trade.entry_price);

    let profit = 0;

    if (trade.side === "BUY") {
      profit = (price - entry) * qty;
    } else {
      profit = (entry - price) * qty;
    }

    const oldBalance = await getBalanceDB();
    await setBalanceDB(oldBalance + profit);

    // Log execution
    await pool.query(
      `
      INSERT INTO trade_executions (trade_id, action, qty, price)
      VALUES ($1, 'partial', $2, $3)
    `,
      [orderId, qty, price]
    );

    // Reduce qty
    await pool.query(
      `
      UPDATE paper_trades
      SET qty = qty - $1
      WHERE id = $2
    `,
      [qty, orderId]
    );

    return {
      success: true,
      message: "Partial close executed",
      orderId,
      filledPrice: price,
      qty,
    };
  }

  /* ----------------------
       FULL CLOSE
  ---------------------- */
  async closeTrade(orderId: string): Promise<ExecutionResult> {
    const { rows } = await pool.query(
      `SELECT * FROM paper_trades WHERE id = $1`,
      [orderId]
    );

    if (rows.length === 0) {
      return { success: false, message: "Trade not found" };
    }

    const trade = rows[0];
    const price = await getPrice(trade.symbol, "crypto");
    const entry = Number(trade.entry_price);
    const qty = Number(trade.qty);

    let profit = 0;

    if (trade.side === "BUY") {
      profit = (price - entry) * qty;
    } else {
      profit = (entry - price) * qty;
    }

    const oldBalance = await getBalanceDB();
    await setBalanceDB(oldBalance + profit);

    await pool.query(
      `
      INSERT INTO trade_executions (trade_id, action, qty, price)
      VALUES ($1, 'close', $2, $3)
    `,
      [orderId, qty, price]
    );

    // Remove trade
    await pool.query(`DELETE FROM paper_trades WHERE id = $1`, [orderId]);

    return {
      success: true,
      message: "Trade closed",
      orderId,
      filledPrice: price,
      qty,
    };
  }
}
