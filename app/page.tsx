import DashboardClient from "./dashboard/DashboardClient";
import { pool } from "@/lib/neon";

export default async function HomePage() {
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
    <main className="max-w-7xl mx-auto w-full">
      <DashboardClient
        initialSignals={initialSignals}
        recentSignals={recentSignals}
      />
    </main>
  );
}
