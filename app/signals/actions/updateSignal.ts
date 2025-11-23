"use server";

import { pool } from "@/lib/neon";
import { revalidatePath } from "next/cache";
import { validateSignal } from "./validateSignal";

export async function updateSignal(id: number, payload: any) {
  if (!id || isNaN(id)) {
    return { ok: false, error: "Invalid signal ID" };
  }

  // Validate new incoming data
  const validation = validateSignal(payload);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const clean = validation.data!;

  try {
    // Fetch existing row to compare changes
    const existingRes = await pool.query(
      `SELECT * FROM signals WHERE id = $1`,
      [id]
    );

    if (existingRes.rowCount === 0) {
      return { ok: false, error: "Signal not found" };
    }

    const old = existingRes.rows[0];

    // Build list of changed fields
    const fields = [
      "symbol",
      "strategy",
      "entry_price",
      "tp1",
      "tp2",
      "sl",
      "notes",
      "type",
      "halaal",
    ];

    const changed: Record<string, any> = {};

    fields.forEach((key) => {
      const oldVal = (old as Record<string, any>)[key];
      const newVal = (clean as Record<string, any>)[key];

      const formattedOld = oldVal === null ? null : oldVal;
      const formattedNew = newVal === undefined ? null : newVal;

      if (formattedOld !== formattedNew) {
        changed[key] = formattedNew;
      }
    });

    // If nothing changed → DO NOT update updated_at
    if (Object.keys(changed).length === 0) {
      return { ok: true, data: old, unchanged: true };
    }

    const setClauses = Object.keys(changed)
      .map((key, idx) => `${key}=$${idx + 1}`)
      .join(", ");

    const values = Object.values(changed);

    const sql = `
      UPDATE signals
      SET ${setClauses}, updated_at = NOW()
      WHERE id = $${values.length + 1}
      RETURNING *
    `;

    const updatedRes = await pool.query(sql, [...values, id]);

    const updatedRow = updatedRes.rows[0];

    revalidatePath("/signals");
    revalidatePath(`/signals/${id}/edit`);

    return { ok: true, data: updatedRow };
  } catch (err) {
    console.error("updateSignal error:", err);
    return { ok: false, error: "Failed to update signal" };
  }
}
