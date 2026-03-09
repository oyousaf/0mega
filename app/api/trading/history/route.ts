import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const iso = (v: any) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

/* -------------------------------------------------------
   TRADE HISTORY 
------------------------------------------------------- */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const isAnalytics = searchParams.get("analytics") === "1";

    const rawLimit = n(searchParams.get("limit") ?? 20);
    const limit = isAnalytics ? rawLimit || 10000 : Math.min(rawLimit, 50);

    const offset = Math.max(n(searchParams.get("offset") ?? 0), 0);

    /* -------------------------------------------------
       1. PAGE TRADES BY LATEST EXECUTION
    -------------------------------------------------- */

    const { rows: tradeRows } = await pool.query(
      `
      SELECT
        e.trade_id,
        MAX(e.timestamp) AS last_time,
        p.symbol,
        p.rr,
        p.halaal
      FROM trade_executions e
      JOIN paper_trades p ON p.id = e.trade_id
      GROUP BY e.trade_id, p.symbol, p.rr, p.halaal
      ORDER BY last_time DESC
      LIMIT $1 OFFSET $2
      `,
      [limit + 1, offset],
    );

    if (!tradeRows.length) {
      return NextResponse.json({ trades: [], hasMore: false });
    }

    const hasMore = tradeRows.length > limit;

    const pageTrades = tradeRows.slice(0, limit);

    const tradeIds = pageTrades.map((r) => r.trade_id);

    /* -------------------------------------------------
       2. FETCH EXECUTIONS
    -------------------------------------------------- */

    const { rows: execRows } = await pool.query(
      `
      SELECT
        id,
        trade_id,
        side,
        qty,
        price,
        broker,
        timestamp
      FROM trade_executions
      WHERE trade_id = ANY($1)
      ORDER BY trade_id, timestamp ASC
      `,
      [tradeIds],
    );

    /* -------------------------------------------------
       3. GROUP EXECUTIONS
    -------------------------------------------------- */

    const execMap: Record<number, any[]> = {};

    for (const r of execRows) {
      if (!execMap[r.trade_id]) execMap[r.trade_id] = [];

      execMap[r.trade_id].push({
        exec_id: r.id,
        side: r.side,
        qty: n(r.qty),
        price: n(r.price),
        broker: r.broker ?? "paper",
        time: iso(r.timestamp),
      });
    }

    /* -------------------------------------------------
       4. BUILD TRADES
    -------------------------------------------------- */

    const trades = pageTrades
      .map((row) => {
        const executions = execMap[row.trade_id] ?? [];

        if (!executions.length) return null;

        const entry = executions[0];
        const exit =
          executions.length > 1 ? executions[executions.length - 1] : null;

        const qty = entry.qty;

        const realised_pl = exit
          ? entry.side === "BUY"
            ? (exit.price - entry.price) * qty
            : (entry.price - exit.price) * qty
          : null;

        return {
          trade_id: row.trade_id,
          symbol: row.symbol ?? "UNKNOWN",

          side: entry.side,
          qty,

          entry_price: entry.price,
          entry_fill_price: entry.price,
          exit_fill_price: exit?.price ?? null,

          realised_pl,

          opened_at: entry.time,
          closed_at: exit?.time ?? null,
          is_closed: Boolean(exit),

          strategy: "Structure",

          rr: Number.isFinite(Number(row.rr)) ? Number(row.rr) : null,
          halaal: row.halaal ?? true,

          executions,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ trades, hasMore });
  } catch (err: any) {
    console.error("History route error:", err);

    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 },
    );
  }
}
