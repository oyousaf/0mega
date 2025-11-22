"use server";

import { runStatusEngine } from "@/lib/statusEngine";
import { pool } from "@/lib/neon";

export async function runEngineAction() {
  const result = await pool.query(
    `SELECT * FROM signals ORDER BY created_at DESC`
  );

  const signals = result.rows;

  await runStatusEngine(signals);
  
  const updated = await pool.query(
    `SELECT * FROM signals ORDER BY created_at DESC`
  );
  return updated.rows;
}
