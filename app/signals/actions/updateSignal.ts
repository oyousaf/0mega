"use server";

import { pool } from "@/lib/neon";
import { revalidatePath } from "next/cache";
import { validateSignal } from "./validateSignal";

export async function updateSignal(id: number, payload: any) {
  if (!id || isNaN(id)) {
    return { ok: false, error: "Invalid signal ID" };
  }

  const validation = validateSignal(payload);

  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const clean = validation.data!; // safe because we just checked valid

  try {
    const result = await pool.query(
      `
      UPDATE signals
      SET 
        symbol=$1,
        strategy=$2,
        entry_price=$3,
        tp1=$4,
        tp2=$5,
        sl=$6,
        notes=$7,
        type=$8,
        halaal=$9,
        updated_at = NOW()
      WHERE id=$10
      RETURNING *
      `,
      [
        clean.symbol,
        clean.strategy ?? null,
        clean.entry_price,
        clean.tp1 ?? null,
        clean.tp2 ?? null,
        clean.sl ?? null,
        clean.notes ?? null,
        clean.type,
        clean.halaal,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return { ok: false, error: "Signal not found" };
    }

    revalidatePath("/signals");
    revalidatePath(`/signals/edit/${id}`);

    return { ok: true, data: result.rows[0] };
  } catch (err) {
    console.error("updateSignal error:", err);
    return { ok: false, error: "Failed to update signal" };
  }
}
