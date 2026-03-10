import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
import { getDailyRisk } from "@/lib/engine/risk/dailyRisk";

const ASSUMED_EQUITY = 100000;
const MAX_DAILY_LOSS_PCT = 0.02;

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

  let automationEnabled = false;
  let tradingAllowed = false;

  /* -----------------------------------------
     AUTOMATION FLAG (SOURCE OF TRUTH)
  ------------------------------------------ */

  try {
    const { rows } = await pool.query(`
      SELECT automation_enabled
      FROM system_settings
      LIMIT 1
    `);

    automationEnabled = Boolean(rows[0]?.automation_enabled);
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

    openTrades = Number(rows[0]?.c ?? 0);
  } catch (err) {
    console.error("Open trades query failed", err);
  }

  /* -----------------------------------------
     TRADES OPENED TODAY
  ------------------------------------------ */

  try {
    const { rows } = await pool.query(
      `
      SELECT COUNT(*)::int AS c
      FROM paper_trades
      WHERE opened_at >= $1
      `,
      [start.toISOString()],
    );

    tradesToday = Number(rows[0]?.c ?? 0);
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
      [start.toISOString()],
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
      SELECT GREATEST(
        COALESCE(MAX(opened_at), 'epoch'),
        COALESCE(MAX(closed_at), 'epoch')
      ) AS last_tick
      FROM paper_trades
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
    lastTick,
  });
}
