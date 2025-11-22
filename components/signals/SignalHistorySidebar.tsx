"use client";

import { useEffect, useState } from "react";
import { getSignalHistory } from "@/app/signals/actions/getSignalHistory";

export default function SignalHistorySidebar({
  signalId,
}: {
  signalId: number;
}) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function refreshHistory() {
    const rows = await getSignalHistory(signalId);
    setEvents(rows || []);
    setLoading(false);
  }

  useEffect(() => {
    refreshHistory();

    const id = setInterval(refreshHistory, 60000);
    return () => clearInterval(id);
  }, [signalId]);

  return (
    <aside
      className="bg-omega-green/40 border border-omega-dark-gold rounded-xl p-5 shadow-lg 
                     h-fit relative top-6 lg:top-12"
    >
      {/* HEADER */}
      <h2 className="text-xl font-semibold text-omega-gold mb-4 pb-2 border-b border-omega-dark-gold/40">
        Recent Activity
      </h2>

      {loading && <p className="text-omega-gold/70">Loading…</p>}

      {!loading && events.length === 0 && (
        <p className="text-omega-gold/70">No recent activity.</p>
      )}

      {/* EVENT LIST */}
      <div className="space-y-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="p-3 rounded-lg bg-omega-green/20 border border-omega-dark-gold/30"
          >
            <p className="font-semibold text-omega-gold uppercase tracking-wider">
              {ev.event}
            </p>

            {ev.price && (
              <p className="text-sm text-omega-gold/80">Price: {ev.price}</p>
            )}

            <p className="text-xs text-omega-gold/60 mt-1">
              {new Date(ev.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
}
