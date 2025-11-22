import { pool } from "@/lib/neon";
import EditSignalClient from "./EditSignalClient";
import SignalHistorySidebar from "@/components/signals/SignalHistorySidebar";

export default async function EditSignalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const numericId = Number(id);

  if (!numericId || isNaN(numericId)) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center text-red-500">
        Invalid signal ID.
      </div>
    );
  }

  const { rows } = await pool.query(`SELECT * FROM signals WHERE id = $1`, [
    numericId,
  ]);

  if (!rows.length) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center text-red-500">
        Signal not found.
      </div>
    );
  }

  const signal = rows[0];

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
      {/* Left: Edit Form */}
      <div>
        <EditSignalClient signal={signal} />
      </div>

      {/* Right: History Sidebar */}
      <div>
        <SignalHistorySidebar signalId={signal.id} />
      </div>
    </div>
  );
}
