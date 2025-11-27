import { pool } from "@/lib/neon";
import { normalizeSignalRow } from "@/lib/signal/normalise";

/**
 * Fetches all non-closed signals for dashboards / metrics.
 * All rows are normalised so UI receives consistent shape.
 */
export async function getSignals() {
  const { rows } = await pool.query(`
    SELECT *
    FROM signals
    WHERE UPPER(status) != 'CLOSED'
    ORDER BY created_at DESC
  `);

  return rows.map(normalizeSignalRow);
}
