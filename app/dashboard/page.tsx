import DashboardClient from "./DashboardClient";
import { pool } from "@/lib/neon";

export default async function DashboardPage() {
  const { rows: initialSignals } = await pool.query(
    `SELECT * FROM signals ORDER BY created_at DESC`
  );

  const { rows: recentSignals } = await pool.query(
    `SELECT id, symbol, status, created_at, halaal
     FROM signals
     ORDER BY created_at DESC
     LIMIT 5`
  );

  return (
    <DashboardClient
      initialSignals={initialSignals}
      recentSignals={recentSignals}
    />
  );
}
