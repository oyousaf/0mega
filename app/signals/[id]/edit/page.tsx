import { pool } from "@/lib/neon";
import EditSignalClient from "./EditSignalClient";

export default async function EditSignalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows } = await pool.query(
    `SELECT * FROM signals WHERE id = $1`,
    [id]
  );

  if (!rows.length) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <h1 className="text-3xl text-omega-gold font-semibold">
          Signal Not Found
        </h1>
      </div>
    );
  }

  return <EditSignalClient signal={rows[0]} />;
}
