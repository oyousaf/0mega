import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getDailyRisk } from "@/lib/engine/risk/dailyRisk";
import { RISK_CONFIG } from "@/lib/trading/config/riskConfig";

const ASSUMED_EQUITY = RISK_CONFIG.initialEquity;
const MAX_DAILY_LOSS_PCT = RISK_CONFIG.maxDailyLossPct;

/* -------------------------------------------------
   TODAY ENGINE STATUS
-------------------------------------------------- */

export async function GET() {
  const now = new Date();

  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  let pnlToday = 0;
  let tradesToday = 0;
  let openTrades = 0;
  let lossUsedPct = 0;
  let tradingAllowed = false;
  let automationEnabled = false;

  /* -----------------------------------------
     AUTOMATION FLAG
  ------------------------------------------ */

  try {
    const { rows } = await pool.query(`
      SELECT enabled
      FROM automation_state
      LIMIT 1
    `);

    automationEnabled = Boolean(rows[0]?.enabled);
  } catch (err) {
    console.error("Automation flag query failed", err);
  }

  /* -----------------------------------------
     OPEN TRADES
  ------------------------------------------ */

  try {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int AS c
      FROM paper_trades
      WHERE is_closed = false
    `);

    openTrades = rows[0]?.c ?? 0;
  } catch (err) {
    console.error("Open trades query failed", err);
  }

  /* -----------------------------------------
     TRADES TODAY
  ------------------------------------------ */

  try {
    const { rows } = await pool.query(
      `
      SELECT COUNT(*)::int AS c
      FROM paper_trades
      WHERE opened_at >= $1
      `,
      [start],
    );

    tradesToday = rows[0]?.c ?? 0;
  } catch (err) {
    console.error("Trades today query failed", err);
  }

  /* -----------------------------------------
     REALISED PNL TODAY
  ------------------------------------------ */

  try {
    const { rows } = await pool.query(
      `
      SELECT COALESCE(SUM(realised_pl),0) AS pnl
      FROM paper_trades
      WHERE is_closed = true
      AND closed_at >= $1
      `,
      [start],
    );

    const pnl = Number(rows[0]?.pnl ?? 0);

    pnlToday = Math.abs(pnl) < 0.005 ? 0 : pnl;
  } catch (err) {
    console.error("PNL query failed", err);
  }

  /* -----------------------------------------
     DAILY RISK
  ------------------------------------------ */

  try {
    const risk = getDailyRisk("GLOBAL");

    const maxLossAmount = ASSUMED_EQUITY * MAX_DAILY_LOSS_PCT;

    lossUsedPct =
      pnlToday < 0 ? Math.min(Math.abs(pnlToday) / maxLossAmount, 1) * 100 : 0;

    tradingAllowed = automationEnabled && !risk?.frozen;
  } catch (err) {
    console.error("Risk state read failed", err);
  }

  /* -----------------------------------------
     LAST ENGINE ACTIVITY
  ------------------------------------------ */

  let lastTick: string | null = null;

  try {
    const { rows } = await pool.query(`
      SELECT MAX(timestamp) AS last_tick
      FROM trade_executions
    `);

    lastTick = rows[0]?.last_tick ?? null;
  } catch (err) {
    console.error("Last tick query failed", err);
  }

  return NextResponse.json({
    pnlToday,
    tradesToday,
    openTrades,
    lossUsedPct,
    tradingAllowed,
    lastTick: lastTick ?? new Date().toISOString(),
  });
}
