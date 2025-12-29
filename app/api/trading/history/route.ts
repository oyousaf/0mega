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
   TRADE HISTORY (EXECUTION-ONLY)
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = n(searchParams.get("limit") ?? 200);
    const offset = n(searchParams.get("offset") ?? 0);

    /* ---------------------------------------------
       1. Fetch executions
    ---------------------------------------------- */
    const { rows } = await pool.query(
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
      ORDER BY timestamp ASC
      `
    );

    if (!rows.length) {
      return NextResponse.json({ trades: [] });
    }

    /* ---------------------------------------------
       2. Group by trade_id
    ---------------------------------------------- */
    const tradeMap: Record<string, any[]> = {};

    for (const r of rows) {
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

    /* ---------------------------------------------
       3. Build trades
    ---------------------------------------------- */
    const trades = Object.entries(tradeMap)
      .map(([trade_id, executions]) => {
        const entry = executions[0];
        const exit = executions.length > 1
          ? executions[executions.length - 1]
          : null;

        const isBuy = entry.side === "BUY";
        const qty = entry.qty;

        const realised_pl =
          exit
            ? isBuy
              ? (exit.price - entry.price) * qty
              : (entry.price - exit.price) * qty
            : null;

        return {
          trade_id,
          symbol: "BTCUSDT", // safe default for now
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
      })
      .sort(
        (a, b) =>
          new Date(b.opened_at!).getTime() -
          new Date(a.opened_at!).getTime()
      )
      .slice(offset, offset + limit);

    return NextResponse.json({ trades });
  } catch (err: any) {
    console.error("History route error:", err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
