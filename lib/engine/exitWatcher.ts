import { pool } from "@/lib/neon";
import { closeTrade } from "@/lib/trading/automation/executionHelpers";

type ExitResult = "SL_HIT" | "TP_HIT" | null;

export async function runExitWatcher(currentPrice: number): Promise<boolean> {
  const { rows } = await pool.query(`
    SELECT id, side, sl, tp1
    FROM paper_trades
    WHERE is_closed = false
    LIMIT 1
  `);

  if (!rows.length) return false;

  const t = rows[0];
  const exit = checkExit(t, currentPrice);
  if (!exit) return false;

  const tradeId = Number(t.id);
  await closeTrade(tradeId);

  console.log("[EXIT]", exit);
  return true;
}

function checkExit(
  trade: { side: "BUY" | "SELL"; sl: number; tp1: number | null },
  price: number
): ExitResult {
  if (trade.side === "BUY") {
    if (price <= Number(trade.sl)) return "SL_HIT";
    if (trade.tp1 != null && price >= Number(trade.tp1)) return "TP_HIT";
  } else {
    if (price >= Number(trade.sl)) return "SL_HIT";
    if (trade.tp1 != null && price <= Number(trade.tp1)) return "TP_HIT";
  }
  return null;
}
