import { pool } from "@/lib/neon";
import { normalizeSignalRow } from "@/lib/signal/normalise";

/**
 * Fetch ALL signals (including CLOSED)
 * Recommended for dashboards, analytics, and history pages.
 */
export async function getSignalsAll() {
  const { rows } = await pool.query(`
    SELECT *
    FROM signals
    ORDER BY created_at DESC
  `);

  return rows.map(normalizeSignalRow);
}

/**
 * Fetch ONLY active-like signals (filters out CLOSED)
 * Used exclusively by the Active Signals page.
 */
export async function getSignalsActive() {
  const { rows } = await pool.query(`
    SELECT *
    FROM signals
    WHERE UPPER(status) != 'CLOSED'
    ORDER BY created_at DESC
  `);

  return rows.map(normalizeSignalRow);
}

/**
 * Fetch ONLY CLOSED signals
 * Designed for future Closed Trades / History views.
 */
export async function getSignalsClosed() {
  const { rows } = await pool.query(`
    SELECT *
    FROM signals
    WHERE UPPER(status) = 'CLOSED'
    ORDER BY created_at DESC
  `);

  return rows.map(normalizeSignalRow);
}
