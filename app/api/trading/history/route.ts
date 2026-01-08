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
   TRADE HISTORY (EXECUTION-ONLY)
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const isAnalytics = searchParams.get("analytics") === "1";
    const rawLimit = n(searchParams.get("limit") ?? 20);

    const limit = isAnalytics ? rawLimit || 10_000 : Math.min(rawLimit, 50);

    const offset = Math.max(n(searchParams.get("offset") ?? 0), 0);

    /* -------------------------------------------------
       1. Get trade_ids for this page
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
       2. Fetch executions for those trade_ids
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
       3. Group executions by trade_id
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
       4. Build trade objects
    -------------------------------------------------- */
    const trades = pageTradeIds.map((trade_id) => {
      const executions = tradeMap[String(trade_id)] ?? [];
      const entry = executions[0];
      const exit =
        executions.length > 1 ? executions[executions.length - 1] : null;

      const isBuy = entry.side === "BUY";
      const qty = entry.qty;

      const realised_pl = exit
        ? isBuy
          ? (exit.price - entry.price) * qty
          : (entry.price - exit.price) * qty
        : null;

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

        strategy: "Structure",
        rr: null,
        halaal: true,

        executions,
      };
    });

    return NextResponse.json({
      trades,
      hasMore,
    });
  } catch (err: any) {
    console.error("History route error:", err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
