import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { symbol, strategy, entry_price, tp1, tp2, sl, notes, type, halaal } =
      body;

    if (!symbol || !entry_price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO signals 
      (symbol, strategy, entry_price, tp1, tp2, sl, notes, type, halaal, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE', NOW(), NOW())
      RETURNING *;
      `,
      [
        symbol?.trim(),
        strategy?.trim() || "",
        entry_price,
        tp1 ?? null,
        tp2 ?? null,
        sl ?? null,
        typeof notes === "string" ? notes.trim() : "",
        type,
        halaal,
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("API POST /signals error:", err);
    return NextResponse.json(
      { error: "Failed to add signal" },
      { status: 500 }
    );
  }
}
