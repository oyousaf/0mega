import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

/* ------------------------------------------------
   PNL SUMMARY
------------------------------------------------ */
export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT
        trade_id,
        side,
        qty,
        price,
        timestamp
      FROM trade_executions
      ORDER BY trade_id, timestamp ASC
    `);

    if (!rows.length) {
      return NextResponse.json({
        daily: 0,
        weekly: 0,
        monthly: 0,
      });
    }

    const now = new Date();
    const todayStr = now.toDateString();

    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    // Group executions by trade
    const map = new Map<string, any[]>();

    for (const r of rows) {
      const tid = String(r.trade_id);
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid)!.push(r);
    }

    for (const executions of map.values()) {
      if (executions.length < 2) continue;

      const entry = executions[0];
      const exit = executions[executions.length - 1];

      const qty = Number(entry.qty) || 0;
      const entryPrice = Number(entry.price) || 0;
      const exitPrice = Number(exit.price) || 0;

      if (!qty || !entryPrice || !exitPrice) continue;

      const pl =
        entry.side === "BUY"
          ? (exitPrice - entryPrice) * qty
          : (entryPrice - exitPrice) * qty;

      const closed = new Date(exit.timestamp);
      if (isNaN(closed.getTime())) continue;

      if (closed.toDateString() === todayStr) {
        daily += pl;
      }

      const diffDays =
        (now.getTime() - closed.getTime()) / 86400000;

      if (diffDays <= 7) weekly += pl;
      if (diffDays <= 30) monthly += pl;
    }

    return NextResponse.json({
      daily: Number(daily.toFixed(2)),
      weekly: Number(weekly.toFixed(2)),
      monthly: Number(monthly.toFixed(2)),
    });
  } catch (err: any) {
    console.error("PNL summary error:", err);
    return NextResponse.json(
      { error: err.message || String(err) },
      { status: 500 }
    );
  }
}
