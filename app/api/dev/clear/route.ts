import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Not allowed in production." },
        { status: 403 }
      );
    }

    // Clear history table first
    await pool.query(`DELETE FROM signal_history;`);

    // Clear signals
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
