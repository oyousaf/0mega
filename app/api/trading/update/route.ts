import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

/**
 * Updates the status of an existing signal in Neon DB.
 * Accepts: { id: number, status: string, current_price?: number }
 */
export async function POST(req: Request) {
  try {
    const { id, status, current_price } = await req.json();

    if (!id || !status)
      return NextResponse.json(
        { error: "Missing required fields (id, status)" },
        { status: 400 }
      );

    const result = await pool.query(
      `UPDATE signals
       SET status = $1,
           updated_at = NOW(),
           current_price = $2
       WHERE id = $3
       RETURNING *`,
      [status, current_price ?? null, id]
    );

    if (result.rowCount === 0)
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });

    return NextResponse.json({ success: true, updated: result.rows[0] });
  } catch (err: any) {
    console.error("Status update failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
