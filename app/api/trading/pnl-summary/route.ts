import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

/* ------------------------------------------------
   SAFE NUMBER
------------------------------------------------ */

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/* ------------------------------------------------
   PNL SUMMARY
------------------------------------------------ */

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        SUM(realised_pl)
          FILTER (
            WHERE closed_at >= CURRENT_DATE
          ) AS daily,

        SUM(realised_pl)
          FILTER (
            WHERE closed_at >= NOW() - INTERVAL '7 days'
          ) AS weekly,

        SUM(realised_pl)
          FILTER (
            WHERE closed_at >= NOW() - INTERVAL '30 days'
          ) AS monthly

      FROM paper_trades
      WHERE is_closed = true
        AND realised_pl IS NOT NULL
    `);

    const r = rows[0] ?? {};

    const daily = n(r.daily);
    const weekly = n(r.weekly);
    const monthly = n(r.monthly);

    return NextResponse.json({
      daily,
      weekly,
      monthly,
    });
  } catch (err: any) {
    console.error("PNL summary error:", err);

    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 },
    );
  }
}
