"use server";

import { runStatusEngine } from "@/lib/statusEngine";
import { pool } from "@/lib/neon";

export async function runEngineAction() {
  try {
    // 1. Fetch all signals once
    const { rows: initial } = await pool.query(
      `SELECT * FROM signals ORDER BY created_at DESC`
    );

    // 2. Run status engine (this mutates DB)
    await runStatusEngine(initial);

    // 3. Re-fetch the rows after engine updates
    const { rows: updated } = await pool.query(
      `SELECT * FROM signals ORDER BY created_at DESC`
    );

    // 4. Normalise timestamps
    return updated.map((row: any) => ({
      ...row,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : row.created_at,
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : row.updated_at,
    }));
  } catch (err) {
    console.error("runEngineAction error:", err);
    return [];
  }
}
