"use client";

import { useRouter } from "next/navigation";
import SignalCard from "./SignalCard";
import { motion, AnimatePresence } from "framer-motion";
import { Signal } from "@/app/types/signal";

export default function ActiveSignalsClient({
  initialSignals,
}: {
  initialSignals: Signal[];
}) {
  const router = useRouter();

  return (
    <main className="max-w-7xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-omega-gold">
          📡 Active Signals
        </h1>

        <button
          onClick={() => router.push("/signals/new")}
          className="px-4 py-2 bg-omega-gold text-omega-green rounded-md font-semibold"
        >
          + Add Signal
        </button>
      </div>

      <AnimatePresence>
        {initialSignals.length === 0 ? (
          <p className="text-center opacity-70 mt-6">No active signals.</p>
        ) : (
          initialSignals.map((signal) => (
            <motion.div
              key={signal.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
