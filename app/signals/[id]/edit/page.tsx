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

  if (rows.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center text-red-500">
        Signal not found.
      </div>
    );
  }

  const raw = rows[0];

  // Normalise DB row so UI never receives null/incorrect types
  const signal = {
    ...raw,
    symbol: raw.symbol ?? "",
    strategy: raw.strategy ?? "",
    notes: raw.notes ?? "",
    type: raw.type ?? "stock",
    halaal: Boolean(raw.halaal),
    entry_price: raw.entry_price === null ? "" : String(raw.entry_price ?? ""),
    tp1: raw.tp1 === null ? "" : String(raw.tp1 ?? ""),
    tp2: raw.tp2 === null ? "" : String(raw.tp2 ?? ""),
    sl: raw.sl === null ? "" : String(raw.sl ?? ""),
  };

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
      <div>
        <EditSignalClient signal={signal} />
      </div>

      <div>
        <SignalHistorySidebar signalId={signal.id} />
      </div>
    </div>
  );
}
