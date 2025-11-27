"use server";

import { runStatusEngine } from "@/lib/statusEngine";
import { pool } from "@/lib/neon";
import { isValidSignalRow } from "@/lib/validateSignalRow";

/**
 * Converts Postgres row dates to clean ISO strings without mutation.
 */
function normaliseRow(row: any) {
  return {
    ...row,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
  };
}

export async function runEngineAction() {
  try {
    /**
     * 1. Fetch all signals once.
     * Always sorted newest → oldest for consistent UI.
     */
    const { rows: initial } = await pool.query(`
      SELECT * FROM signals
      ORDER BY created_at DESC
    `);

    /**
     * 2. Filter out malformed rows BEFORE engine logic touches them.
     */
    const valid = initial.filter(isValidSignalRow);

    if (valid.length !== initial.length) {
      console.warn(
        `runEngineAction: ${initial.length - valid.length} invalid rows skipped`
      );
    }

    /**
     * 3. Run the Option-B engine:
     *    ACTIVE → TP? → CLOSED
     *    ACTIVE → EXPIRED → CLOSED
     */
    await runStatusEngine(valid);

    /**
     * 4. Re-fetch after engine completes.
     * This guarantees the UI always receives the actual state after transitions.
     */
    const { rows: postEngine } = await pool.query(`
      SELECT * FROM signals
      ORDER BY created_at DESC
    `);

    /**
     * 5. Normalise timestamps for client-side use.
     * Avoids hydration mismatches & TS warnings.
     */
    return postEngine.map(normaliseRow);
  } catch (err) {
    console.error("runEngineAction error:", err);
    return [];
  }
}
