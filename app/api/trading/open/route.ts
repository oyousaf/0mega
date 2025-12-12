import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function GET(req: Request) {
  try {
    const limit = 500;
    const offset = 0;

    // 1. Fetch trades
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

    // 2. Fetch all executions in one query
    const tradeIds = trades.map((t) => t.trade_id);

    const { rows: execs } = await pool.query(
      `
      SELECT *
      FROM trade_executions
      WHERE trade_id = ANY($1)
      ORDER BY time ASC
      `,
      [tradeIds]
    );

    // 3. Group executions by trade_id
    const grouped: Record<string, any[]> = {};
    for (const e of execs) {
      const id = String(e.trade_id);
      if (!grouped[id]) grouped[id] = [];
      grouped[id].push({
        exec_id: e.exec_id,
        price: Number(e.price),
        qty: Number(e.qty),
        side: e.side,
        time: e.time,
        broker: e.broker ?? "paper",
      });
    }

    // 4. Attach executions to each trade
    const result = trades.map((t) => ({
      trade_id: String(t.trade_id),
      symbol: t.symbol,
      side: t.side,
      strategy: t.strategy ?? "Unknown",

      entry_price: Number(t.entry_price),
      entry_fill_price: Number(t.entry_fill_price ?? t.entry_price),

      exit_fill_price: t.exit_fill_price ? Number(t.exit_fill_price) : null,
      realised_pl: t.realised_pl ? Number(t.realised_pl) : null,
      rr: t.rr ? Number(t.rr) : null,

      qty: Number(t.qty),

      opened_at: t.opened_at,
      closed_at: t.closed_at,
      is_closed: t.is_closed,

      executions: grouped[String(t.trade_id)] ?? [],

      halaal: t.halaal ?? true,
    }));

    return NextResponse.json({ trades: result });
  } catch (err: any) {
    console.error("History error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
