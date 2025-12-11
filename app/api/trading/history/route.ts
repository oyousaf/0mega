import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        te.id,
        te.trade_id,
        te.action,
        te.qty,
        te.price,
        te.timestamp,
        t.symbol,
        t.side,
        t.entry_price
      FROM trade_executions te
      LEFT JOIN paper_trades t ON t.id = te.trade_id
      ORDER BY te.timestamp DESC
      LIMIT 50
    `);

    return NextResponse.json({ history: rows });
  } catch (err) {
    console.error("History API failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
