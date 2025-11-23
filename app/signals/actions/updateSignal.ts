"use server";

import { pool } from "@/lib/neon";
import { revalidatePath } from "next/cache";
import { validateSignal } from "./validateSignal";

export async function updateSignal(id: number, payload: any) {
  if (!id || isNaN(id)) {
    return { ok: false, error: "Invalid signal ID" };
  }

  // Validate incoming payload (already normalised by the form)
  const validation = validateSignal(payload);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const clean = validation.data!;

  try {
    // Fetch existing row
    const existingRes = await pool.query(
      `SELECT * FROM signals WHERE id = $1`,
      [id]
    );

    if (existingRes.rowCount === 0) {
      return { ok: false, error: "Signal not found" };
    }

    const old = existingRes.rows[0];

    // Editable fields
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
      const oldVal = old[key];
      let newVal = clean[key];

      // -------------------------------------------------------
      // NORMALIZATION RULES (GLOBAL CONSISTENCY)
      // -------------------------------------------------------

      // Empty strings stay empty strings
      if (newVal === "" || newVal === undefined || newVal === null) {
        newVal = "";
      }

      // Numeric fields must be null OR number
      if (["entry_price", "tp1", "tp2", "sl"].includes(key)) {
        if (newVal === "" || newVal === null || newVal === undefined) {
          newVal = null;
        } else {
          newVal = Number(newVal);
        }
      }

      // halaal always boolean
      if (key === "halaal") {
        newVal = Boolean(newVal);
      }

      // Compare normalized values
      if (oldVal !== newVal) {
        changed[key] = newVal;
      }
    });

    // Nothing changed → skip DB update
    if (Object.keys(changed).length === 0) {
      return { ok: true, unchanged: true, data: old };
    }

    // Build dynamic SQL
    const setClauses = Object.keys(changed)
      .map((k, i) => `${k} = $${i + 1}`)
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
    const updated = updatedRes.rows[0];

    // Revalidate routes
    revalidatePath("/signals");
    revalidatePath(`/signals/${id}/edit`);

    return { ok: true, data: updated };
  } catch (err) {
    console.error("updateSignal error:", err);
    return { ok: false, error: "Failed to update signal" };
  }
}
