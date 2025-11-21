import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function POST(req: Request) {
  try {
    const {
      symbol,
      strategy,
      entry_price,
      tp1,
      tp2,
      sl,
      status,
      type,
      halaal,
    } = await req.json();

    const result = await pool.query(
      `
      INSERT INTO signals 
      (symbol, strategy, entry_price, tp1, tp2, sl, status, type, halaal)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [symbol, strategy, entry_price, tp1, tp2, sl, status, type, halaal]
    );

    return NextResponse.json({ success: true, signal: result.rows[0] });
  } catch (err) {
    console.error("Error inserting signal:", err);
    return NextResponse.json(
      { error: "Failed to create signal" },
      { status: 500 }
    );
  }
}
