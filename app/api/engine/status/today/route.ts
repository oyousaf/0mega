import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
import { getDailyRisk } from "@/lib/engine/risk/dailyRisk";

const MAX_DAILY_LOSS = 0.02;

/* -------------------------------------------------
   TODAY ENGINE STATUS (CANONICAL)
-------------------------------------------------- */
export async function GET() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
  );

  let pnlToday = 0;
  let tradesToday = 0;
  let openTrades = 0;
  let lossUsedPct = 0;
  let tradingAllowed = true;

  /* -----------------------------------------
     1. OPEN TRADES
  ------------------------------------------ */
  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*) AS open_trades
      FROM paper_trades
    `);

    openTrades = Number(rows[0]?.open_trades ?? 0);
  } catch (err) {
    console.error("Open trades query failed", err);
  }

  /* -----------------------------------------
     2. TRADES TOUCHED TODAY (execution truth)
  ------------------------------------------ */
  try {
    const { rows } = await pool.query(
      `
      SELECT COUNT(DISTINCT trade_id) AS trades_today
      FROM trade_executions
      WHERE timestamp >= $1
      `,
      [start.toISOString()]
    );

    tradesToday = Number(rows[0]?.trades_today ?? 0);
  } catch (err) {
    console.error("Trades today query failed", err);
  }

  /* -----------------------------------------
     3. REALISED PNL TODAY (close executions)
  ------------------------------------------ */
  try {
    const { rows } = await pool.query(
      `
      SELECT
        t.side AS trade_side,
        t.entry_price,
        t.qty,
        e.price AS exit_price
      FROM trade_executions e
      JOIN paper_trades t ON t.id = e.trade_id
      WHERE
        e.timestamp >= $1
        AND e.intent = 'CLOSE'
      `,
      [start.toISOString()]
    );

    for (const r of rows) {
      const entry = Number(r.entry_price);
      const exit = Number(r.exit_price);
      const qty = Number(r.qty);

      if (!isFinite(entry) || !isFinite(exit) || !isFinite(qty)) continue;

      pnlToday +=
        r.trade_side === "LONG" ? (exit - entry) * qty : (entry - exit) * qty;
    }
  } catch (err) {
    console.error("PnL query failed", err);
  }

  /* -----------------------------------------
     4. DAILY RISK (engine state)
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
  } catch (err) {
    console.error("Risk state read failed", err);
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
