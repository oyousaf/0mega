import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
import { getDailyRisk } from "@/lib/engine/risk/dailyRisk";

const MAX_DAILY_LOSS = 0.02;

/* -------------------------------------------------
   TODAY ENGINE STATUS
-------------------------------------------------- */
export async function GET() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  // Safe defaults
  let pnlToday = 0;
  let tradesToday = 0;
  let openTrades = 0;
  let lossUsedPct = 0;
  let tradingAllowed = true;

  /* -----------------------------------------
     1. Trades today + open trades (DB truth)
  ------------------------------------------ */
  try {
    const { rows } = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE opened_at >= $1) AS trades_today,
        COUNT(*) FILTER (WHERE status = 'OPEN') AS open_trades
      FROM paper_trades
      `,
      [start.toISOString()]
    );

    tradesToday = Number(rows[0]?.trades_today ?? 0);
    openTrades = Number(rows[0]?.open_trades ?? 0);
  } catch {
    // swallow
  }

  /* -----------------------------------------
     2. Realised PnL today (executions)
  ------------------------------------------ */
  try {
    const { rows } = await pool.query(
      `
      SELECT
        t.side,
        t.entry_price,
        t.qty,
        e.price,
        e.side AS exec_side
      FROM trade_executions e
      JOIN paper_trades t ON t.id = e.trade_id
      WHERE e.timestamp >= $1
      `,
      [start.toISOString()]
    );

    for (const e of rows) {
      if (e.exec_side !== (e.side === "BUY" ? "SELL" : "BUY")) continue;

      const entry = Number(e.entry_price);
      const exit = Number(e.price);
      const qty = Number(e.qty);

      if (!isFinite(entry) || !isFinite(exit) || !isFinite(qty)) continue;

      pnlToday +=
        e.side === "BUY" ? (exit - entry) * qty : (entry - exit) * qty;
    }
  } catch {
    // swallow
  }

  /* -----------------------------------------
     3. Daily risk
  ------------------------------------------ */
  try {
    const risk = getDailyRisk("GLOBAL");

    if (risk) {
      lossUsedPct =
        risk.realisedPnl < 0
          ? Math.min(Math.abs(risk.realisedPnl) / MAX_DAILY_LOSS, 1) * 100
          : 0;

      tradingAllowed = !risk.frozen;
    }
  } catch {
    // engine not initialised yet
  }

  return NextResponse.json({
    pnlToday,
    tradesToday,
    openTrades,
    lossUsedPct,
    tradingAllowed,
    lastTick: new Date().toISOString(),
  });
}
