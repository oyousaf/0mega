import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

/* ---------------------------------------------
   OPEN TRADES (PAPER TRUTH)
--------------------------------------------- */
export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        id AS trade_id,
        symbol,
        side,
        entry_price,
        qty,
        opened_at,
        halaal,
        signal_id,
        sl,
        tp1,
        rr,
        realised_pl
      FROM paper_trades
      WHERE is_closed = false
      ORDER BY opened_at DESC
    `);

    // Paper balance is synthetic for now
    const balance = 100000;

    return NextResponse.json({
      positions: rows,
      balance,
    });
  } catch (err: any) {
    console.error("Open trades route failed", err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
