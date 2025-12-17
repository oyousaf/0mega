import { pool } from "@/lib/neon";

export async function recordHeartbeat() {
  await pool.query(
    `
    INSERT INTO automation_heartbeat (status)
    VALUES ('RUNNING')
    `
  );
}
