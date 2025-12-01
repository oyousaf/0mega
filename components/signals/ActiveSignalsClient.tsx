"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { runEngineAction } from "@/app/signals/actions/runEngine";
import { normalizeSignalRow } from "@/lib/signal/normalise";
import { formatTimestamp } from "@/app/utils/formatTimestamp";

import { Signal } from "@/app/types/signal";

import SignalCard from "./SignalCard";

import { motion, AnimatePresence } from "framer-motion";

export default function ActiveSignalsClient({
  initialSignals,
}: {
  initialSignals: Signal[];
}) {
  const router = useRouter();

  /* -----------------------------------------------
     STATE
  ------------------------------------------------ */
  const [signals, setSignals] = useState<Signal[]>(() =>
    initialSignals
      .map((s) => ({
        ...normalizeSignalRow(s),
        lastUpdatedFormatted: formatTimestamp(s.updated_at),
      }))
      .filter((s) => s.status === "ACTIVE")
  );

  /* -----------------------------------------------
     REFRESH ENGINE (same as All Signals)
  ------------------------------------------------ */
  async function refresh() {
    try {
      const updated = await runEngineAction();
      if (!Array.isArray(updated)) return;

      const activeOnly = updated
        .map((s) => ({
          ...normalizeSignalRow(s),
          lastUpdatedFormatted: formatTimestamp(s.updated_at),
        }))
        .filter((s) => s.status === "ACTIVE");

      setSignals(activeOnly);
    } catch (err) {
      console.error("Active signals refresh error:", err);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  /* -----------------------------------------------
     UI
  ------------------------------------------------ */
  return (
    <main className="max-w-7xl mx-auto w-full p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <motion.h1
          className="text-3xl font-semibold text-omega-gold"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          📡 Active Signals
        </motion.h1>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/signals/all")}
            className="px-4 py-2 border border-omega-gold text-omega-gold rounded-md hover:bg-omega-gold/10 transition"
          >
            All Signals
          </button>

          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 border border-omega-gold text-omega-gold rounded-md hover:bg-omega-gold/10 transition"
          >
            Dashboard
          </button>

          <button
            onClick={() => router.push("/signals/new")}
            className="px-4 py-2 bg-omega-gold text-omega-green rounded-md font-semibold hover:bg-omega-dark-gold transition"
          >
            + Add Signal
          </button>
        </div>
      </div>

      {/* SIGNAL LIST */}
      <AnimatePresence>
        {signals.length === 0 ? (
          <motion.p
            className="text-center opacity-70 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            No active signals.
          </motion.p>
        ) : (
          signals.map((signal) => (
            <motion.div
              key={signal.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <SignalCard
                signal={signal}
                onEdit={() => router.push(`/signals/${signal.id}/edit`)}
                onDelete={() => {}}
              />
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </main>
  );
}
