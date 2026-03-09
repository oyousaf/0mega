import { pool } from "@/lib/neon";
import { closeTrade } from "@/lib/trading/automation/executionHelpers";
import type { Candle } from "@/types/trade";

type ExitResult = "SL_HIT" | "TP_HIT" | null;

type OpenTradeRow = {
  id: number;
  side: "BUY" | "SELL";
  sl: number;
  tp1: number | null;
};

export async function runExitWatcher(candle: Candle): Promise<boolean> {
  const high = Number(candle.high);
  const low = Number(candle.low);
  const close = Number(candle.close);

  if (
    !Number.isFinite(high) ||
    !Number.isFinite(low) ||
    !Number.isFinite(close)
  ) {
    return false;
  }

  return withDbLock(async () => {
    const { rows } = await pool.query<OpenTradeRow>(`
      SELECT id, side, sl, tp1
      FROM paper_trades
      WHERE is_closed = false
      ORDER BY id ASC
      FOR UPDATE
    `);

    if (!rows.length) return false;

    let closedAny = false;

    for (const trade of rows) {
      const exit = checkExit(trade, high, low);
      if (!exit) continue;

      const exitPrice = getExitPrice(trade, exit, close);

      const res = await closeTrade(Number(trade.id), exit, exitPrice);

      if (!res.success) {
        console.warn("[EXIT_FAILED]", {
          tradeId: trade.id,
          exit,
          error: res.error,
        });
        continue;
      }

      console.log("[EXIT]", {
        tradeId: trade.id,
        reason: exit,
        exitPrice,
        high,
        low,
        sl: Number(trade.sl),
        tp1: trade.tp1 != null ? Number(trade.tp1) : null,
      });

      closedAny = true;
    }

    return closedAny;
  });
}

function checkExit(
  trade: { side: "BUY" | "SELL"; sl: number; tp1: number | null },
  high: number,
  low: number,
): ExitResult {
  const sl = Number(trade.sl);
  const tp1 = trade.tp1 != null ? Number(trade.tp1) : null;

  if (trade.side === "BUY") {
    if (low <= sl) return "SL_HIT";
    if (tp1 !== null && high >= tp1) return "TP_HIT";
  }

  if (trade.side === "SELL") {
    if (high >= sl) return "SL_HIT";
    if (tp1 !== null && low <= tp1) return "TP_HIT";
  }

  return null;
}

function getExitPrice(
  trade: { side: "BUY" | "SELL"; sl: number; tp1: number | null },
  exit: "SL_HIT" | "TP_HIT",
  fallbackClose: number,
) {
  if (exit === "SL_HIT") {
    return Number(trade.sl);
  }

  if (exit === "TP_HIT" && trade.tp1 != null) {
    return Number(trade.tp1);
  }

  return fallbackClose;
}

async function withDbLock<T>(fn: () => Promise<T>): Promise<T> {
  await pool.query("BEGIN");

  try {
    await pool.query("SELECT pg_advisory_xact_lock(424242)");
    const result = await fn();
    await pool.query("COMMIT");
    return result;
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }
}
