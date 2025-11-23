"use client";

import { useEffect, useState } from "react";
import { getSignalHistory } from "@/app/signals/actions/getSignalHistory";
import { formatTimestamp } from "@/app/utils/formatTimestamp";
import { formatStatus } from "@/app/utils/formatStatus";

// Status → colour mapping
const statusColor = (status: string) => {
  if (status.includes("TP2")) return "#37C86E";
  if (status.includes("TP1")) return "#56AE57";
  if (status.includes("SL")) return "#C23B22";
  if (status.includes("EXP")) return "#A77F35";
  return "#789FCC";
};

export default function SignalHistorySidebar({
  signalId,
}: {
  signalId: number;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function refreshHistory() {
    const rows = await getSignalHistory(signalId);

    const ordered = (rows || []).sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setEvents(ordered);
    setLoading(false);
  }

  useEffect(() => {
    refreshHistory();
    const id = setInterval(refreshHistory, 60000);
    return () => clearInterval(id);
  }, [signalId]);

  return (
    <aside className="bg-omega-green/40 border border-omega-dark-gold rounded-xl p-5 shadow-lg h-fit relative top-6 lg:top-12">
      <h2 className="text-xl font-semibold text-omega-gold mb-4 pb-2 border-b border-omega-dark-gold/40">
        Recent Activity
      </h2>

      {loading && <p className="text-omega-gold/70">Loading…</p>}

      {!loading && events.length === 0 && (
        <p className="text-omega-gold/70">No recent activity.</p>
      )}

      <div className="space-y-3">
        {events.map((ev) => {
          const formattedStatus = formatStatus(ev.event);
          const color = statusColor(formattedStatus);

          return (
            <div
              key={ev.id}
              className="p-3 rounded-lg bg-omega-green/20 border border-omega-dark-gold/30"
            >
              {/* STATUS PILL */}
              <span
                className="inline-block text-xs font-bold px-2 py-1 rounded-md text-white"
                style={{ backgroundColor: color }}
              >
                {formattedStatus}
              </span>

              {/* PRICE */}
              {ev.price && (
                <p className="text-sm text-omega-gold/80 mt-1">
                  Price: {ev.price}
                </p>
              )}

              {/* TIMESTAMP */}
              <p className="text-xs text-omega-gold/60 mt-1">
                {formatTimestamp(ev.timestamp)}
              </p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
