"use server";

import { runStatusEngine } from "@/lib/statusEngine";
import { pool } from "@/lib/neon";

export async function runEngineAction() {
  try {
    // Fetch once
    const { rows: initial } = await pool.query(
      `SELECT * FROM signals ORDER BY created_at DESC`
    );

    // Run status engine
    await runStatusEngine(initial);

    // Fetch again ONLY after engine operations
    const { rows: updated } = await pool.query(
      `SELECT * FROM signals ORDER BY created_at DESC`
    );

    // Normalize timestamps to readable ISO format
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
