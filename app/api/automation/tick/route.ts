import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_closed = false) AS open_trades,
        COUNT(*) FILTER (WHERE is_closed = true)  AS closed_trades
      FROM paper_trades
    `);

    return NextResponse.json({
      success: true,
      engine: "price_loop",
      openTrades: Number(rows[0]?.open_trades ?? 0),
      closedTrades: Number(rows[0]?.closed_trades ?? 0),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Automation status error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}
