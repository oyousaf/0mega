"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiHome, FiSettings, FiCpu } from "react-icons/fi";

export default function DashboardHeader({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/automation/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) =>
        setEnabled(
          typeof j?.automation?.enabled === "boolean"
            ? j.automation.enabled
            : false
        )
      )
      .catch(() => setEnabled(false));
  }, []);

  async function toggleAutomation() {
    if (busy || enabled === null) return;

    const prev = enabled;
    setBusy(true);
    setEnabled(!prev);

    try {
      const res = await fetch("/api/automation/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !prev }),
      });

      const json = await res.json();
      if (typeof json.enabled !== "boolean") throw new Error();
      setEnabled(json.enabled);
    } catch {
      setEnabled(prev);
    } finally {
      setBusy(false);
    }
  }

  const cpuColor =
    enabled === null
      ? "text-omega-gold"
      : enabled
      ? "text-green-400"
      : "text-red-400";

  return (
    <>
      <div className="sticky top-0 z-50 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-xl px-3 py-2 sm:px-4 sm:py-3 bg-omega-green border border-omega-dark-gold shadow-lg">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-omega-dark-gold text-omega-gold hover-omega transition-colors duration-300"
            >
              <FiHome size={16} />
            </motion.button>

            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-base sm:text-xl md:text-2xl font-semibold text-omega-gold text-center leading-none select-none"
            >
              𝛀mega
            </motion.h1>

            <div className="flex justify-end gap-1.5 sm:gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleAutomation}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-omega-dark-gold ${cpuColor} hover-omega transition-colors duration-300`}
              >
                <FiCpu size={16} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onOpenSettings}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-omega-dark-gold text-omega-gold hover-omega transition-colors duration-300"
              >
                <FiSettings size={16} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-3 sm:h-4" />
    </>
  );
}
