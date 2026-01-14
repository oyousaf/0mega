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

  /* LOAD AUTOMATION STATE */
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

  /* TOGGLE */
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
      {/* STICKY OFFSET */}
      <div
        className="sticky top-0 z-50"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          {/* HEADER BAR */}
          <div
            className="grid grid-cols-[auto_1fr_auto] items-center rounded-xl px-3 py-2 sm:px-4 sm:py-3
              backdrop-blur border border-omega-dark-gold overflow-hidden"
            style={{ backgroundColor: "rgba(0, 72, 48, 0.7)" }}
          >
            {/* HOME */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-omega-dark-gold
                text-omega-gold hover:bg-omega-dark-gold/10"
            >
              <FiHome size={16} />
            </motion.button>

            {/* TITLE */}
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-base sm:text-xl md:text-2xl font-semibold text-omega-gold text-center leading-none select-none"
            >
              𝛀mega
            </motion.h1>

            {/* ACTIONS */}
            <div className="flex justify-end gap-1.5 sm:gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleAutomation}
                title={enabled ? "Automation enabled" : "Automation disabled"}
                className={`w-8 h-8 sm:w-9 sm:h-9
                  flex items-center justify-center
                  rounded-full border border-omega-dark-gold
                  ${cpuColor}
                  hover:bg-omega-dark-gold/10 transition`}
              >
                <FiCpu size={16} />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onOpenSettings}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center
                  rounded-full border border-omega-dark-gold
                  text-omega-gold hover:bg-omega-dark-gold/10"
              >
                <FiSettings size={16} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* SPACER TO PREVENT OVERLAP */}
      <div className="h-3 sm:h-4" />
    </>
  );
}
