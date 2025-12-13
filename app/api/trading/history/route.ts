import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

/* -------------------------------------------------------
   SAFE CAST HELPERS
------------------------------------------------------- */
const n = (v: any) => (isFinite(Number(v)) ? Number(v) : 0);
const iso = (v: any) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

/* -------------------------------------------------------
   TRADE HISTORY (EXECUTION-DRIVEN)
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = n(searchParams.get("limit") || 200);
    const offset = n(searchParams.get("offset") || 0);

    /* ---------------------------------------------
       1. Fetch trades
    ---------------------------------------------- */
    const { rows: trades } = await pool.query(
      `
      SELECT *
      FROM paper_trades
      ORDER BY opened_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    if (!trades.length) {
      return NextResponse.json({ trades: [] });
    }

    /* ---------------------------------------------
       2. Fetch executions
    ---------------------------------------------- */
    const ids = trades.map((t) => t.id);

    const { rows: execs } = await pool.query(
      `
      SELECT
        id,
        trade_id,
        price,
        qty,
        side,
        timestamp AS exec_time,
        broker
      FROM trade_executions
      WHERE trade_id = ANY($1)
      ORDER BY timestamp ASC
      `,
      [ids]
    );

    /* ---------------------------------------------
       3. Group executions
    ---------------------------------------------- */
    const execMap: Record<string, any[]> = {};
    for (const e of execs) {
      const key = String(e.trade_id);
      if (!execMap[key]) execMap[key] = [];
      execMap[key].push({
        exec_id: e.id,
        price: n(e.price),
        qty: n(e.qty),
        side: e.side, // open | partial | close
        time: iso(e.exec_time),
        broker: e.broker ?? "paper",
      });
    }

    /* ---------------------------------------------
       4. Build history objects
       (realised PnL only)
    ---------------------------------------------- */
    const result = trades.map((t) => {
      const tid = String(t.id);
      const executions = execMap[tid] ?? [];

      const opens = executions.filter((e) => e.side === "open");
      const closes = executions.filter((e) => e.side === "close");

      const entryFill =
        opens.length > 0
          ? opens.reduce((s, e) => s + e.price * e.qty, 0) /
            opens.reduce((s, e) => s + e.qty, 0)
          : n(t.entry_price);

      let exitFill = null;
      let realised = null;
      let closedAt = null;

      if (closes.length) {
        exitFill =
          closes.reduce((s, e) => s + e.price * e.qty, 0) /
          closes.reduce((s, e) => s + e.qty, 0);

        closedAt = closes[closes.length - 1].time;

        realised =
          t.side === "BUY"
            ? (exitFill - entryFill) * n(t.qty)
            : (entryFill - exitFill) * n(t.qty);
      }

      return {
        trade_id: tid,
        symbol: t.symbol,
        side: t.side,

        strategy: t.strategy ?? "Unknown",

        entry_price: n(t.entry_price),
        entry_fill_price: entryFill,
        exit_fill_price: exitFill,

        realised_pl: realised,

        qty: n(t.qty),
        opened_at: iso(t.opened_at),
        closed_at: closedAt,
        is_closed: exitFill !== null,

        executions,

        halaal: t.halaal ?? true,
      };
    });

    return NextResponse.json({ trades: result });
  } catch (err: any) {
    console.error("History route error:", err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
