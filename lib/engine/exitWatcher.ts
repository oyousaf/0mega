import { pool } from "@/lib/neon";
import { closeTrade } from "@/lib/trading/automation/executionHelpers";
import type { Candle } from "@/types/trade";

type ExitResult = "SL_HIT" | "TP_HIT" | null;

type OpenTradeRow = {
  id: number;
  symbol: string;
  side: "BUY" | "SELL";
  sl: number;
  tp1: number | null;
};

const EXIT_LOCK_KEY = 424242;

export async function runExitWatcher(candle: Candle): Promise<boolean> {
  const symbol = String((candle as Candle & { symbol?: string }).symbol ?? "");

  if (!symbol) {
    console.warn("[EXIT] candle missing symbol");
    return false;
  }

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

  return withExitLock(async () => {
    const { rows } = await pool.query<OpenTradeRow>(
      `
      SELECT
        id,
        symbol,
        side,
        sl,
        tp1
      FROM paper_trades
      WHERE symbol = $1
        AND is_closed = false
      ORDER BY id ASC
      `,
      [symbol],
    );

    if (!rows.length) return false;

    let closedAny = false;

    for (const trade of rows) {
      const exit = checkExit(trade, high, low);
      if (!exit) continue;

      const exitPrice = getExitPrice(trade, exit, close);
      const result = await closeTrade(trade.id, exit, exitPrice);

      if (!result.success) {
        console.warn("[EXIT_FAILED]", {
          tradeId: trade.id,
          symbol,
          exit,
          error: result.error,
        });
        continue;
      }

      console.log("[EXIT]", {
        tradeId: trade.id,
        symbol,
        reason: exit,
        exitPrice,
        high,
        low,
        sl: Number(trade.sl),
        tp1: trade.tp1 === null ? null : Number(trade.tp1),
      });

      closedAny = true;
    }

    return closedAny;
  });
}

function checkExit(
  trade: Pick<OpenTradeRow, "side" | "sl" | "tp1">,
  high: number,
  low: number,
): ExitResult {
  const sl = Number(trade.sl);
  const tp1 = trade.tp1 === null ? null : Number(trade.tp1);

  if (!Number.isFinite(sl)) return null;
  if (tp1 !== null && !Number.isFinite(tp1)) return null;

  if (trade.side === "BUY") {
    // Conservative rule when both levels occur in one candle.
    if (low <= sl) return "SL_HIT";
    if (tp1 !== null && high >= tp1) return "TP_HIT";
  } else {
    if (high >= sl) return "SL_HIT";
    if (tp1 !== null && low <= tp1) return "TP_HIT";
  }

  return null;
}

function getExitPrice(
  trade: Pick<OpenTradeRow, "sl" | "tp1">,
  exit: Exclude<ExitResult, null>,
  fallbackClose: number,
): number {
  if (exit === "SL_HIT") {
    return Number(trade.sl);
  }

  if (trade.tp1 !== null) {
    return Number(trade.tp1);
  }

  return fallbackClose;
}

async function withExitLock<T>(fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("SELECT pg_advisory_lock($1)", [EXIT_LOCK_KEY]);
    return await fn();
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [EXIT_LOCK_KEY]);
    } finally {
      client.release();
    }
  }
}
