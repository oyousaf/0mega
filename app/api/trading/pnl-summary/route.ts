import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

/* ------------------------------------------------
   PNL SUMMARY
------------------------------------------------ */

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(realised_pl)
          FILTER (WHERE closed_at::date = CURRENT_DATE), 0) AS daily,

        COALESCE(SUM(realised_pl)
          FILTER (WHERE closed_at >= NOW() - INTERVAL '7 days'), 0) AS weekly,

        COALESCE(SUM(realised_pl)
          FILTER (WHERE closed_at >= NOW() - INTERVAL '30 days'), 0) AS monthly

      FROM paper_trades
      WHERE is_closed = true
        AND realised_pl IS NOT NULL
    `);

    const r = rows[0] ?? {};

    return NextResponse.json({
      daily: Number(Number(r.daily ?? 0).toFixed(2)),
      weekly: Number(Number(r.weekly ?? 0).toFixed(2)),
      monthly: Number(Number(r.monthly ?? 0).toFixed(2)),
    });
  } catch (err: any) {
    console.error("PNL summary error:", err);

    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 },
    );
  }
}
