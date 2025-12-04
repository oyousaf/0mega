import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";
import { normalizeSignalRow } from "@/lib/signal/normalise";

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM signals
      ORDER BY created_at DESC
    `);

    const normalised = rows.map((row) => normalizeSignalRow(row));

    return NextResponse.json({ signals: normalised });
  } catch (err) {
    console.error("Dashboard refresh error:", err);
    return NextResponse.json({ signals: [] });
  }
}
