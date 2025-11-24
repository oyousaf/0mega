"use server";

import { pool } from "@/lib/neon";
import { revalidatePath } from "next/cache";
import { validateSignal } from "./validateSignal";

export async function updateSignal(id: number, payload: any) {
  if (!id || isNaN(id)) {
    return { ok: false, error: "Invalid signal ID" };
  }

  // Validate incoming fields
  const validation = validateSignal(payload);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const clean = validation.data!;

  try {
    // Load existing row
    const { rows, rowCount } = await pool.query(
      `SELECT * FROM signals WHERE id = $1`,
      [id]
    );
    if (rowCount === 0) return { ok: false, error: "Signal not found" };

    const old = rows[0];

    // Only user-editable fields
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
    ] as const;

    const changed: Record<string, any> = {};

    for (const key of fields) {
      let oldVal = old[key];
      let newVal = clean[key as keyof typeof clean];

      // Numeric fields
      if (["entry_price", "tp1", "tp2", "sl"].includes(key)) {
        const nOld =
          oldVal === null
            ? null
            : typeof oldVal === "string"
            ? Number(oldVal)
            : oldVal;
        const nNew =
          newVal === "" || newVal === null || newVal === undefined
            ? null
            : Number(newVal);

        if (nOld !== nNew) changed[key] = nNew;
        continue;
      }

      // Normalize strings
      if (typeof newVal === "string") newVal = newVal.trim();
      if (newVal === "") newVal = "";

      // Boolean
      if (key === "halaal") newVal = Boolean(newVal);

      // Compare normalized values
      if (`${oldVal}` !== `${newVal}`) changed[key] = newVal;
    }

    // No changes → skip update
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

    // Revalidate pages
    revalidatePath("/signals");
    revalidatePath(`/signals/${id}/edit`);

    return { ok: true, data: updated };
  } catch (err) {
    console.error("updateSignal error:", err);
    return { ok: false, error: "Failed to update signal" };
  }
}
