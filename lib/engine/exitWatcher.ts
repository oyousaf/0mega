import { pool } from "@/lib/neon";
import { closeTrade } from "@/lib/trading/automation/executionHelpers";

type ExitResult = "SL_HIT" | "TP1_HIT" | null;

export async function runExitWatcher(currentPrice: number): Promise<boolean> {
  const { rows } = await pool.query(`
    SELECT id, side, sl, tp1, entry_price
    FROM paper_trades
    WHERE is_closed = false
    ORDER BY id DESC
    LIMIT 1
  `);

  if (!rows.length) return false;

  const trade = rows[0];
  const exit = checkExit(trade, currentPrice);
  if (!exit) return false;

  await closeTrade(Number(trade.id));

  console.log("[EXIT]", {
    tradeId: trade.id,
    reason: exit,
    price: currentPrice,
    sl: trade.sl,
    tp1: trade.tp1,
  });

  return true;
}

function checkExit(
  trade: {
    side: "BUY" | "SELL";
    sl: number;
    tp1: number | null;
  },
  price: number
): ExitResult {
  if (trade.side === "BUY") {
    if (price <= trade.sl) return "SL_HIT";
    if (trade.tp1 != null && price >= trade.tp1) return "TP1_HIT";
  } else {
    if (price >= trade.sl) return "SL_HIT";
    if (trade.tp1 != null && price <= trade.tp1) return "TP1_HIT";
  }
  return null;
}
