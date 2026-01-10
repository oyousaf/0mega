import { pool } from "@/lib/neon";
import { closeTrade } from "@/lib/trading/automation/executionHelpers";

type ExitResult = "SL_HIT" | "TP_HIT" | null;

export async function runExitWatcher(currentPrice: number): Promise<boolean> {
  const { rows } = await pool.query(`
    SELECT id, side, sl, tp1
    FROM paper_trades
    WHERE is_closed = false
    ORDER BY id DESC
    LIMIT 1
  `);

  if (!rows.length) return false;

  const trade = rows[0];
  const exit = checkExit(trade, currentPrice);
  if (!exit) return false;

  const res = await closeTrade(Number(trade.id), exit, currentPrice);

  if (!res.success) {
    console.warn("[EXIT_FAILED]", {
      tradeId: trade.id,
      exit,
      error: res.error,
    });
    return false;
  }

  console.log("[EXIT]", {
    tradeId: trade.id,
    reason: exit,
    price: currentPrice,
    sl: Number(trade.sl),
    tp1: trade.tp1 != null ? Number(trade.tp1) : null,
  });

  return true;
}

function checkExit(
  trade: { side: "BUY" | "SELL"; sl: number; tp1: number | null },
  price: number
): ExitResult {
  const sl = Number(trade.sl);
  const tp1 = trade.tp1 != null ? Number(trade.tp1) : null;

  if (trade.side === "BUY") {
    if (price <= sl) return "SL_HIT";
    if (tp1 != null && price >= tp1) return "TP_HIT";
  } else {
    if (price >= sl) return "SL_HIT";
    if (tp1 != null && price <= tp1) return "TP_HIT";
  }

  return null;
}
