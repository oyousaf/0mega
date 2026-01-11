import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

/* -------------------------------------------------------
   SAFE CAST HELPERS
------------------------------------------------------- */
const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const iso = (v: any) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

/* -------------------------------------------------------
   TRADE HISTORY (EXECUTION-ONLY + RR/HALAAL PATCH)
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const isAnalytics = searchParams.get("analytics") === "1";
    const rawLimit = n(searchParams.get("limit") ?? 20);
    const limit = isAnalytics ? rawLimit || 10_000 : Math.min(rawLimit, 50);
    const offset = Math.max(n(searchParams.get("offset") ?? 0), 0);

    /* -------------------------------------------------
       1. Page trade_ids by execution activity
    -------------------------------------------------- */
    const { rows: tradeRows } = await pool.query(
      `
      SELECT
        trade_id,
        MAX(timestamp) AS last_time
      FROM trade_executions
      GROUP BY trade_id
      ORDER BY last_time DESC
      LIMIT $1 OFFSET $2
      `,
      [limit + 1, offset]
    );

    if (!tradeRows.length) {
      return NextResponse.json({ trades: [], hasMore: false });
    }

    const hasMore = tradeRows.length > limit;
    const pageTradeIds = tradeRows.slice(0, limit).map((r) => r.trade_id);

    /* -------------------------------------------------
       2. Fetch executions
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
      [pageTradeIds]
    );

    /* -------------------------------------------------
       3. Fetch trade metadata (RR + halaal ONLY)
    -------------------------------------------------- */
    const { rows: tradeMeta } = await pool.query(
      `
      SELECT
        id,
        rr,
        halaal
      FROM paper_trades
      WHERE id = ANY($1)
      `,
      [pageTradeIds]
    );

    const metaMap: Record<string, any> = {};
    for (const r of tradeMeta) {
      metaMap[String(r.id)] = r;
    }

    /* -------------------------------------------------
       4. Group executions by trade_id
    -------------------------------------------------- */
    const tradeMap: Record<string, any[]> = {};

    for (const r of execRows) {
      const tid = String(r.trade_id);
      if (!tradeMap[tid]) tradeMap[tid] = [];

      tradeMap[tid].push({
        exec_id: r.id,
        side: r.side,
        qty: n(r.qty),
        price: n(r.price),
        broker: r.broker ?? "paper",
        time: iso(r.timestamp),
      });
    }

    /* -------------------------------------------------
       5. Build trade objects
    -------------------------------------------------- */
    const trades = pageTradeIds.map((trade_id) => {
      const executions = tradeMap[String(trade_id)] ?? [];
      const entry = executions[0];
      const exit =
        executions.length > 1 ? executions[executions.length - 1] : null;

      const qty = entry.qty;
      const isBuy = entry.side === "BUY";

      const realised_pl = exit
        ? isBuy
          ? (exit.price - entry.price) * qty
          : (entry.price - exit.price) * qty
        : null;

      const meta = metaMap[String(trade_id)] ?? {};

      return {
        trade_id,
        symbol: "BTCUSDT",
        side: entry.side,
        qty,

        entry_price: entry.price,
        entry_fill_price: entry.price,
        exit_fill_price: exit?.price ?? null,

        realised_pl,

        opened_at: entry.time,
        closed_at: exit?.time ?? null,
        is_closed: Boolean(exit),

        // strategy stays hard-coded (no DB column)
        strategy: "Structure",

        rr: Number.isFinite(Number(meta.rr)) ? Number(meta.rr) : null,
        halaal: meta.halaal ?? true,

        executions,
      };
    });

    return NextResponse.json({ trades, hasMore });
  } catch (err: any) {
    console.error("History route error:", err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
