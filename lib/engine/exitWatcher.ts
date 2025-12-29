import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";

type ExitResult = "SL_HIT" | "TP_HIT" | null;

export async function runExitWatcher(currentPrice: number) {
  const { rows: trades } = await pool.query(`
    SELECT id, symbol, side, entry_price, sl, tp1, qty
    FROM paper_trades
    LIMIT 1
  `);

  if (!trades.length) return;

  const trade = trades[0];

  const exit = checkExit(trade, currentPrice);
  if (!exit) return;

  await closeTrade(trade, exit);
}

function checkExit(trade: any, price: number): ExitResult {
  const isBuy = trade.side === "BUY";

  if (isBuy) {
    if (trade.sl && price <= Number(trade.sl)) return "SL_HIT";
    if (trade.tp1 && price >= Number(trade.tp1)) return "TP_HIT";
  } else {
    if (trade.sl && price >= Number(trade.sl)) return "SL_HIT";
    if (trade.tp1 && price <= Number(trade.tp1)) return "TP_HIT";
  }

  return null;
}

async function closeTrade(trade: any, reason: ExitResult) {
  const broker = getBroker();

  await pool.query("BEGIN");

  try {
    await broker.closeOrder(trade.id, trade.qty);

    await pool.query(`DELETE FROM paper_trades WHERE id = $1`, [trade.id]);

    console.log("[EXIT]", reason, trade.symbol);

    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}
