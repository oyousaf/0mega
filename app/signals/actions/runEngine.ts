"use server";

import { runStatusEngine } from "@/lib/statusEngine";
import { pool } from "@/lib/neon";
import { normalizeSignalRow } from "@/lib/signal/normalise";

export async function runEngineAction() {
  try {
    // 1. Fetch all rows (raw)
    const { rows: initial } = await pool.query(`
      SELECT * FROM signals
      ORDER BY created_at DESC
    `);

    // 2. Engine receives raw DB rows
    await runStatusEngine(initial);

    // 3. Re-fetch after engine finishes
    const { rows: updated } = await pool.query(`
      SELECT * FROM signals
      ORDER BY created_at DESC
    `);

    // 4. Normalise for the frontend (pretty status + ISO dates)
    return updated.map((row) => normalizeSignalRow(row));
  } catch (err) {
    console.error("runEngineAction error:", err);
    return [];
  }
}
