"use client";

import { useEffect, useState } from "react";
import { getSignalHistory } from "@/app/signals/actions/getSignalHistory";
import { formatTimestamp } from "@/app/utils/formatTimestamp";

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

  // Status dot
  function getDotColor(event: string) {
    const ev = event.toUpperCase();

    if (ev.includes("TP2")) return "#37C86E";
    if (ev.includes("TP1")) return "#56AE57";
    if (ev.includes("SL")) return "#C23B22";
    if (ev.includes("EXP")) return "#A77F35";

    return "#789FCC";
  }

  return (
    <aside
      className="
        bg-omega-green/40 
        border border-omega-dark-gold 
        rounded-xl 
        p-5 
        shadow-lg 
        h-fit 
        relative 
        top-6 lg:top-12
      "
    >
      <h2 className="text-xl font-semibold text-omega-gold mb-4 pb-2 border-b border-omega-dark-gold/40">
        Recent Activity
      </h2>

      {loading && <p className="text-omega-gold/70">Loading…</p>}

      {!loading && events.length === 0 && (
        <p className="text-omega-gold/70">No recent activity.</p>
      )}

      <div className="space-y-3">
        {events.map((ev) => {
          const color = getDotColor(ev.event);

          return (
            <div
              key={ev.id}
              className="
                p-3 
                rounded-lg 
                bg-omega-green/20 
                border border-omega-dark-gold/30
              "
            >
              <div className="flex items-center gap-2">
                {/* Status Dot */}
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}AA`,
                    display: "inline-block",
                  }}
                ></span>

                <p className="font-semibold text-omega-gold uppercase tracking-wider">
                  {ev.event}
                </p>
              </div>

              {ev.price && (
                <p className="text-sm text-omega-gold/80 ml-[14px]">
                  Price: {ev.price}
                </p>
              )}

              <p className="text-xs text-omega-gold/60 mt-1 ml-[14px]">
                {formatTimestamp(ev.timestamp)}
              </p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
