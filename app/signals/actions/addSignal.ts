"use server";

import { pool } from "@/lib/neon";
import { validateSignal } from "./validateSignal";

export async function addSignal(payload: any) {
  const validation = validateSignal(payload);

  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const data = validation.data!;

  try {
    const result = await pool.query(
      `
      INSERT INTO signals 
      (symbol, strategy, entry_price, tp1, tp2, sl, notes, type, halaal, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', NOW(), NOW())
      RETURNING *;
      `,
      [
        data.symbol,
        data.strategy ?? null,
        data.entry_price,
        data.tp1 ?? null,
        data.tp2 ?? null,
        data.sl ?? null,
        data.notes ?? null,
        data.type,
        data.halaal,
      ]
    );

    return { ok: true, data: result.rows[0] };
  } catch (err) {
    console.error("AddSignal error:", err);
    return { ok: false, error: "Failed to add signal" };
  }
}
