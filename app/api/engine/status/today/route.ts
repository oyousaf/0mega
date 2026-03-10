import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
import { getDailyRisk } from "@/lib/engine/risk/dailyRisk";

const ASSUMED_EQUITY = 100000;
const MAX_DAILY_LOSS_PCT = 0.02;

/* -------------------------------------------------
   GLOBAL ENGINE STATE
-------------------------------------------------- */

declare global {
  var __OMEGA_ENGINE_RUNNING__: boolean | undefined;
}

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
  let tradingAllowed = true;

  const engineRunning = Boolean(globalThis.__OMEGA_ENGINE_RUNNING__);

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

    pnlToday = Number(rows[0]?.pnl ?? 0);
  } catch (err) {
    console.error("PNL query failed", err);
  }

  /* -----------------------------------------
     DAILY RISK + ENGINE STATE
  ------------------------------------------ */
  try {
    const risk = getDailyRisk("GLOBAL");

    const maxLossAmount = ASSUMED_EQUITY * MAX_DAILY_LOSS_PCT;

    lossUsedPct =
      pnlToday < 0 ? Math.min(Math.abs(pnlToday) / maxLossAmount, 1) * 100 : 0;

    if (risk) {
      tradingAllowed = engineRunning && !risk.frozen;
    } else {
      tradingAllowed = engineRunning;
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
