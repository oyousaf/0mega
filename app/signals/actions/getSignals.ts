import { pool } from "@/lib/neon";

/**
 * ACTIVE SIGNALS ONLY
 * CLOSED rows are preserved in DB but never returned for the Active UI.
 */
export async function getSignals() {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM signals
    WHERE UPPER(status) != 'CLOSED'
    ORDER BY created_at DESC
    `
  );

  return rows;
}
