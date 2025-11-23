"use server";

import { pool } from "@/lib/neon";
import { revalidatePath } from "next/cache";
import { validateSignal } from "./validateSignal";

export async function updateSignal(id: number, payload: any) {
  if (!id || isNaN(id)) {
    return { ok: false, error: "Invalid signal ID" };
  }

  // Validate using Zod
  const validation = validateSignal(payload);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const clean = validation.data!;

  try {
    const existingRes = await pool.query(
      `SELECT * FROM signals WHERE id = $1`,
      [id]
    );

    if (existingRes.rowCount === 0) {
      return { ok: false, error: "Signal not found" };
    }

    const old = existingRes.rows[0];

    // Editable columns
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
      "status",
    ] as const;

    type Field = (typeof fields)[number];
    const changed: Partial<Record<Field, any>> = {};

    fields.forEach((key) => {
      const oldVal = old[key as keyof typeof old];
      const newVal = clean[key];

      let formattedNew: any = newVal;

      // -------------------------------------------------------
      // ✨ NORMALISE VALUES BEFORE COMPARISON / DB INSERT
      // -------------------------------------------------------

      // Empty string stays empty string
      if (formattedNew === "") {
        formattedNew = "";
      }

      // Optional numeric fields:
      if (["tp1", "tp2", "sl"].includes(key)) {
        if (formattedNew === "" || formattedNew === undefined) {
          formattedNew = null;
        }
      }

      if (key === "notes") {
        if (formattedNew === undefined || formattedNew === null) {
          formattedNew = "";
        }
      }

      // Compare after formatting
      if (oldVal !== formattedNew) {
        changed[key] = formattedNew;
      }
    });

    // No changes → don't update updated_at
    if (Object.keys(changed).length === 0) {
      return { ok: true, data: old, unchanged: true };
    }

    // Build dynamic SQL
    const setClauses = Object.keys(changed)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ");

    const values = Object.values(changed);

    const sql = `
      UPDATE signals
      SET ${setClauses},
          updated_at = NOW()
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
