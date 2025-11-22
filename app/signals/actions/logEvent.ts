"use server";

import { pool } from "@/lib/neon";

export async function logEvent(
  signalId: number,
  event: string,
  price?: number
) {
  try {
    await pool.query(
      `
      INSERT INTO signal_history (signal_id, event, price_at_event, source)
      VALUES ($1, $2, $3, 'engine')
      `,
      [signalId, event, price ?? null]
    );
  } catch (err) {
    console.error("logEvent error:", err);
  }
}
