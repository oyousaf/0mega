import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function GET() {
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        pt.id AS trade_id,
        pt.symbol,
        pt.side AS trade_side,
        pt.entry_price,
        pt.qty AS trade_qty,
        pt.opened_at,

        te.id AS exec_id,
        te.price AS exec_price,
        te.qty AS exec_qty,
        te.side AS exec_side,
        te.timestamp AS exec_time,
        te.broker

      FROM paper_trades pt
      LEFT JOIN trade_executions te
        ON te.order_id = pt.id::text

      ORDER BY pt.opened_at DESC, te.timestamp DESC NULLS LAST;
      `
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
