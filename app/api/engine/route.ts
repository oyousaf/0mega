import { NextResponse } from "next/server";
import { runStatusEngine } from "@/lib/statusEngine";
import { pool } from "@/lib/neon";

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM signals ORDER BY created_at DESC`
    );

    await runStatusEngine(rows);

    const { rows: updated } = await pool.query(
      `SELECT * FROM signals ORDER BY created_at DESC`
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Engine API error:", err);
    return NextResponse.json({ error: "Engine failed" }, { status: 500 });
  }
}
