"use server";

import { pool } from "@/lib/neon";

export async function getSignalHistory(signalId: number) {
  const result = await pool.query(
    `
    SELECT * FROM signal_history
    WHERE signal_id = $1
    ORDER BY timestamp DESC
    LIMIT 5
    `,
    [signalId]
  );

  return result.rows;
}
