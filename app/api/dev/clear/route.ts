import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

// Prevent accidental execution in production
const isProduction = process.env.NODE_ENV === "production";

export async function GET() {
  if (isProduction) {
    return NextResponse.json(
      { error: "Not allowed in production." },
      { status: 403 }
    );
  }

  try {
    // Clear history table first (FK-safe)
    await pool.query(`DELETE FROM signal_history;`);

    // Clear all signals
    await pool.query(`DELETE FROM signals;`);

    return NextResponse.json({
      success: true,
      message: "All signals and history cleared.",
    });
  } catch (err) {
    console.error("Clear error:", err);
    return NextResponse.json(
      { error: "Failed to clear database." },
      { status: 500 }
    );
  }
}
