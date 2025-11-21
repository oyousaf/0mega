import { pool } from "@/lib/neon";
import EditSignalClient from "./EditSignalClient";

export default async function EditSignalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { rows } = await pool.query(`SELECT * FROM signals WHERE id = $1`, [
    id,
  ]);

  if (!rows.length) {
    return null;
  }

  return <EditSignalClient signal={rows[0]} />;
}
