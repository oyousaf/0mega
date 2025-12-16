import { pool } from "@/lib/neon";
import type { Signal } from "./types";

export async function getActiveSignals(): Promise<Signal[]> {
  const { rows } = await pool.query(
    `
    SELECT
      id,
      symbol,
      market,
      direction,
      entry_price,
      tp1,
      tp2,
      sl,
      risk_pct AS "riskPct",
      created_at
    FROM signals
    WHERE status = 'ACTIVE'
    ORDER BY created_at ASC
    `
  );

  return rows;
}
