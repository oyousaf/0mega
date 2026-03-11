import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function GET() {
  try {
    const now = new Date();

    const startToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const startWeek = new Date(startToday);
    startWeek.setUTCDate(startWeek.getUTCDate() - 7);

    const startMonth = new Date(startToday);
    startMonth.setUTCMonth(startMonth.getUTCMonth() - 1);

    /* ----------------------------------
       AUTOMATION + OPEN TRADES
    ---------------------------------- */

    const [automationRes, openTradesRes] = await Promise.all([
      pool.query(`
        SELECT enabled
        FROM automation_state
        LIMIT 1
      `),

      pool.query(`
        SELECT
          id,
          symbol,
          side,
          qty,
          entry_price,
          sl,
          tp1,
          rr,
          opened_at
        FROM paper_trades
        WHERE is_closed = false
        ORDER BY opened_at DESC
      `),
    ]);

    const automationEnabled = Boolean(automationRes.rows?.[0]?.enabled);

    const openTrades = openTradesRes.rows;

    /* ----------------------------------
       METRICS + PNL SUMMARY
    ---------------------------------- */

    const metricsRes = await pool.query(
      `
      SELECT

        COUNT(*) FILTER (WHERE realised_pl > 0)::float /
        NULLIF(COUNT(*),0) * 100 AS win_rate,

        AVG(realised_pl) AS expectancy,

        SUM(CASE WHEN realised_pl > 0 THEN realised_pl END) /
        NULLIF(ABS(SUM(CASE WHEN realised_pl < 0 THEN realised_pl END)),0)
        AS profit_factor,

        COALESCE(SUM(CASE WHEN closed_at >= $1 THEN realised_pl END),0)
        AS pnl_daily,

        COALESCE(SUM(CASE WHEN closed_at >= $2 THEN realised_pl END),0)
        AS pnl_weekly,

        COALESCE(SUM(CASE WHEN closed_at >= $3 THEN realised_pl END),0)
        AS pnl_monthly

      FROM paper_trades
      WHERE is_closed = true
      `,
      [startToday, startWeek, startMonth],
    );

    const m = metricsRes.rows?.[0] ?? {};

    const metrics = {
      winRate: Number(m.win_rate ?? 0).toFixed(1),
      expectancy: Number(m.expectancy ?? 0).toFixed(2),
      profitFactor: Number(m.profit_factor ?? 0).toFixed(2),
      halaalRatio: 100,
    };

    const pnlSummary = {
      daily: Number(m.pnl_daily ?? 0),
      weekly: Number(m.pnl_weekly ?? 0),
      monthly: Number(m.pnl_monthly ?? 0),
    };

    /* ----------------------------------
       TRADE HISTORY + EQUITY CURVE
    ---------------------------------- */

    const [historyRes, equityRes, tradesTodayRes] = await Promise.all([
      pool.query(`
        SELECT *
        FROM paper_trades
        WHERE is_closed = true
        ORDER BY closed_at DESC
        LIMIT 20
      `),

      pool.query(`
        SELECT
          closed_at,
          SUM(realised_pl)
          OVER (
            ORDER BY closed_at
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS equity
        FROM paper_trades
        WHERE is_closed = true
        ORDER BY closed_at ASC
        LIMIT 500
      `),

      pool.query(
        `
        SELECT COUNT(*)::int AS c
        FROM paper_trades
        WHERE opened_at >= $1
        `,
        [startToday],
      ),
    ]);

    const tradeHistory = historyRes.rows;
    const equityCurve = equityRes.rows;

    const tradesToday = Number(tradesTodayRes.rows?.[0]?.c ?? 0);

    /* ----------------------------------
       ACCOUNT BALANCE
    ---------------------------------- */

    const balance =
      equityCurve.length > 0
        ? Number(equityCurve[equityCurve.length - 1].equity)
        : 0;

    /* ----------------------------------
       RESPONSE
    ---------------------------------- */

    return NextResponse.json({
      engine: {
        tradingAllowed: automationEnabled,
        running: Boolean(globalThis.__OMEGA_ENGINE_RUNNING__),
        openTrades: openTrades.length,
        tradesToday,
        pnlToday: pnlSummary.daily,
        lastTick: now.toISOString(),
      },

      automation: {
        enabled: automationEnabled,
      },

      metrics,
      openTrades,
      tradeHistory,
      pnlSummary,

      account: {
        balance,
      },

      equityCurve,
    });
  } catch (err) {
    console.error("Dashboard route failed", err);

    return NextResponse.json({ error: "dashboard_failed" }, { status: 500 });
  }
}
