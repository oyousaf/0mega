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
       1. FETCH TRADES (SOURCE OF TRUTH)
    -------------------------------------------------- */

    const { rows: tradeRows } = await pool.query(
      `
      SELECT
        p.id AS trade_id,
        p.symbol,
        p.side,
        p.qty,
        p.entry_price,
        p.realised_pl,
        p.opened_at,
        p.closed_at,
        p.is_closed,
        p.rr,
        p.halaal,
        MAX(e.timestamp) AS last_time
      FROM paper_trades p
      LEFT JOIN trade_executions e
        ON e.trade_id = p.id
      GROUP BY
        p.id,
        p.symbol,
        p.side,
        p.qty,
        p.entry_price,
        p.realised_pl,
        p.opened_at,
        p.closed_at,
        p.is_closed,
        p.rr,
        p.halaal
      ORDER BY last_time DESC NULLS LAST
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
        timestamp: iso(r.timestamp),
      });
    }

    /* -------------------------------------------------
       4. BUILD TRADE OBJECTS
    -------------------------------------------------- */

    const trades = pageTrades.map((row) => {
      const executions = execMap[row.trade_id] ?? [];

      const entry = executions[0] ?? null;
      const exit =
        executions.length > 1 ? executions[executions.length - 1] : null;

      return {
        trade_id: row.trade_id,

        symbol: row.symbol ?? "UNKNOWN",
        side: row.side,

        qty: n(row.qty),

        entry_price: n(row.entry_price),
        entry_fill_price: entry?.price ?? n(row.entry_price),
        exit_fill_price: exit?.price ?? null,

        realised_pl: row.realised_pl !== null ? n(row.realised_pl) : null,

        opened_at: iso(row.opened_at) ?? entry?.timestamp,
        closed_at: iso(row.closed_at) ?? exit?.timestamp ?? null,

        is_closed: Boolean(row.is_closed),

        strategy: "Structure",

        rr: Number.isFinite(Number(row.rr)) ? Number(row.rr) : null,
        halaal: row.halaal ?? true,

        executions,
      };
    });

    return NextResponse.json({ trades, hasMore });
  } catch (err: any) {
    console.error("History route error:", err);

    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 },
    );
  }
}
