"use server";

import { pool } from "@/lib/neon";

export async function logSignalEvent(
  signalId: number,
  event: string,
  price?: number
) {
  try {
    await pool.query(
      `
      INSERT INTO signal_history (signal_id, event, price, timestamp)
      VALUES ($1, $2, $3, NOW())
      `,
      [signalId, event, price ?? null]
    );

    return { ok: true };
  } catch (err) {
    console.error("logSignalEvent error:", err);
    return { ok: false };
  }
}
