import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
import { getDailyRisk } from "@/lib/engine/risk/dailyRisk";

const MAX_DAILY_LOSS = 0.02;

/* -------------------------------------------------
   TODAY ENGINE STATUS (EXECUTION-FIRST)
-------------------------------------------------- */
export async function GET() {
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    /* -----------------------------------------
       1. Trades opened today + open trades
    ------------------------------------------ */
    const { rows: tradeStats } = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE opened_at >= $1) AS trades_today,
        COUNT(*) AS open_trades
      FROM paper_trades
      `,
      [start.toISOString()]
    );

    /* -----------------------------------------
       2. Executions closed today (PnL)
    ------------------------------------------ */
    const { rows: executions } = await pool.query(
      `
      SELECT
        t.side,
        t.entry_price,
        t.qty,
        e.price,
        e.side AS exec_side,
        e.timestamp
      FROM trade_executions e
      JOIN paper_trades t ON t.id = e.trade_id
      WHERE e.timestamp >= $1
      `,
      [start.toISOString()]
    );

    let pnlToday = 0;

    for (const e of executions) {
      if (e.exec_side !== (e.side === "BUY" ? "SELL" : "BUY")) continue;

      const entry = Number(e.entry_price);
      const exit = Number(e.price);
      const qty = Number(e.qty);

      if (!isFinite(entry) || !isFinite(exit) || !isFinite(qty)) continue;

      pnlToday +=
        e.side === "BUY" ? (exit - entry) * qty : (entry - exit) * qty;
    }

    /* -----------------------------------------
       3. Daily risk state (engine memory)
    ------------------------------------------ */
    const risk = getDailyRisk("GLOBAL");

    const lossUsedPct =
      risk.realisedPnl < 0
        ? Math.min(Math.abs(risk.realisedPnl) / MAX_DAILY_LOSS, 1) * 100
        : 0;

    return NextResponse.json({
      pnlToday,
      tradesToday: Number(tradeStats[0]?.trades_today ?? 0),
      openTrades: Number(tradeStats[0]?.open_trades ?? 0),
      lossUsedPct,
      tradingAllowed: !risk.frozen,
      lastTick: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[ENGINE_STATUS_ERROR]", err);
    return NextResponse.json(
      { error: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
