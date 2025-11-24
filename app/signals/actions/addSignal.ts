"use server";

import { pool } from "@/lib/neon";
import { validateSignal } from "./validateSignal";

export async function addSignal(payload: any) {
  // Validate incoming payload
  const validation = validateSignal(payload);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const data = validation.data!;

  // Normalise fields
  const clean = {
    symbol: data.symbol.trim(),
    strategy: data.strategy?.trim() || "",
    entry_price: data.entry_price ?? null,
    tp1: data.tp1 ?? null,
    tp2: data.tp2 ?? null,
    sl: data.sl ?? null,
    notes: typeof data.notes === "string" ? data.notes.trim() : "",
    type: data.type,
    halaal: Boolean(data.halaal),
  };

  try {
    const result = await pool.query(
      `
      INSERT INTO signals 
      (symbol, strategy, entry_price, tp1, tp2, sl, notes, type, halaal, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', NOW(), NOW())
      RETURNING *;
      `,
      [
        clean.symbol,
        clean.strategy,
        clean.entry_price,
        clean.tp1,
        clean.tp2,
        clean.sl,
        clean.notes,
        clean.type,
        clean.halaal,
      ]
    );

    return { ok: true, data: result.rows[0] };
  } catch (err) {
    console.error("addSignal error:", err);
    return { ok: false, error: "Failed to add signal" };
  }
}
