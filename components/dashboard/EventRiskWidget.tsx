"use client";

import { useDashboard } from "@/hooks/useDashboard";

export default function EventRiskWidget() {
  const events = useDashboard(15_000)?.marketEvents ?? [];
  const next = events[0];

  if (!next) {
    return (
      <section className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-xl border border-emerald-900/70 bg-emerald-950/35 px-4 py-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Event risk</h2>
          <p className="mt-1 text-sm text-neutral-300">No scheduled event blackouts.</p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">CLEAR</span>
      </section>
    );
  }

  const start = new Date(next.starts_at);
  const end = new Date(next.ends_at);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  });

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 sm:flex-row sm:items-center">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Next high-impact event</h2>
        <p className="mt-1 font-semibold text-neutral-100">{next.currency} · {next.title}</p>
        <p className="mt-1 text-xs text-neutral-400">
          {formatter.format(start)}–{formatter.format(end)} UK time · entries pause 15 minutes either side
        </p>
      </div>
      <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-auto ${next.is_active ? "bg-red-400/15 text-red-300" : "bg-amber-400/10 text-amber-200"}`}>
        {next.is_active ? "ENTRY BLOCK ACTIVE" : "SCHEDULED"}
      </span>
    </section>
  );
}
