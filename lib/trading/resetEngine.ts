import { pool } from "@/lib/neon";

export async function resetEngineDaily() {
  await pool.query(
    `
    UPDATE engine_state
    SET value = true
    WHERE key = 'TRADING_ENABLED'
    `
  );

  console.log("[ENGINE_RESET] UTC daily reset");
}
