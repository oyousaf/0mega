"use server";

import { pool } from "@/lib/neon";

export async function getSignalHistory(signalId: number) {
  if (!signalId || isNaN(signalId)) return [];

  try {
    const result = await pool.query(
      `
      SELECT id, signal_id, event, price, timestamp
      FROM signal_history
      WHERE signal_id = $1
      ORDER BY timestamp DESC
      LIMIT 5
      `,
      [signalId]
    );

    // Ensure timestamps are always ISO strings for consistency
    return result.rows.map((row: any) => ({
      ...row,
      timestamp:
        row.timestamp instanceof Date
          ? row.timestamp.toISOString()
          : row.timestamp,
    }));
  } catch (err) {
    console.error("getSignalHistory error:", err);
    return [];
  }
}
