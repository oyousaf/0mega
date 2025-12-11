import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function GET(req: Request) {
  try {
    // Pagination params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { rows } = await pool.query(
      `
      SELECT
        pt.id AS trade_id,
        pt.symbol,
        pt.side AS trade_side,
        pt.entry_price,
        pt.qty AS trade_qty,
        pt.opened_at,

        -- aggregated execution data
        COALESCE(
          AVG(te.price) FILTER (WHERE te.side = 'CLOSE'),
          NULL
        ) AS close_price,

        CASE
          WHEN pt.side = 'LONG' AND AVG(te.price) FILTER (WHERE te.side = 'CLOSE') IS NOT NULL
            THEN (AVG(te.price) FILTER (WHERE te.side = 'CLOSE') - pt.entry_price) * pt.qty
          WHEN pt.side = 'SHORT' AND AVG(te.price) FILTER (WHERE te.side = 'CLOSE') IS NOT NULL
            THEN (pt.entry_price - AVG(te.price) FILTER (WHERE te.side = 'CLOSE')) * pt.qty
          ELSE NULL
        END AS realised_pl,

        -- raw execution json array
        COALESCE(
          json_agg(
            json_build_object(
              'exec_id', te.id,
              'price', te.price,
              'qty', te.qty,
              'side', te.side,
              'timestamp', te.timestamp,
              'broker', te.broker
            )
          ) FILTER (WHERE te.id IS NOT NULL),
          '[]'
        ) AS executions

      FROM paper_trades pt
      LEFT JOIN trade_executions te
        ON te.order_id = pt.id::text

      GROUP BY pt.id
      ORDER BY pt.opened_at DESC
      LIMIT $1 OFFSET $2;
      `,
      [limit, offset]
    );

    return NextResponse.json({ success: true, history: rows });
  } catch (err: any) {
    console.error("History API failed:", err);
    return NextResponse.json(
      { error: err.message ?? "History fetch failed" },
      { status: 500 }
    );
  }
}
