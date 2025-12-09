import { NextResponse } from "next/server";
import { pool } from "@/lib/neon";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      symbol,
      strategy,
      entry_price,
      tp1,
      tp2,
      sl,
      notes,
      type,
      direction,
      halaal,
    } = body;

    if (!symbol || !entry_price || !direction) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const cleanSymbol = symbol.trim().toUpperCase();
    const cleanStrategy = strategy?.trim() || "";
    const cleanNotes = typeof notes === "string" ? notes.trim() : "";

    const result = await pool.query(
      `
      INSERT INTO signals 
      (symbol, strategy, entry_price, tp1, tp2, sl, notes, type, direction, halaal, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ACTIVE', NOW(), NOW())
      RETURNING *;
      `,
      [
        cleanSymbol,
        cleanStrategy,
        entry_price,
        tp1 ?? null,
        tp2 ?? null,
        sl ?? null,
        cleanNotes,
        type,
        direction,
        Boolean(halaal),
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to add signal" },
      { status: 500 }
    );
  }
}
