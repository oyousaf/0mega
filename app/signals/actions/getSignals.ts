import { pool } from '@/lib/neon';

export async function getSignals() {
  const result = await pool.query(
    "SELECT * FROM signals ORDER BY created_at DESC"
  );
  return result.rows;
}
