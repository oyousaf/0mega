import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function GET() {
  try {
    const { rows: signals } = await pool.query(
      `SELECT * FROM signals ORDER BY created_at DESC`
    );

    return NextResponse.json({ signals });
  } catch (err) {
    console.error("Dashboard refresh error:", err);
    return NextResponse.json({ signals: [] });
  }
}
