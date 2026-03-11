"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Modal, Button } from "@mui/material";
import { FiHome, FiSettings, FiCpu } from "react-icons/fi";

import NotificationsPanel from "@/app/dashboard/NotificationsPanel";
import {
  useDashboard,
  DashboardPayload,
  refreshDashboard,
} from "@/hooks/useDashboard";

export default function DashboardHeader() {
  const dashboard = useDashboard(15000) as DashboardPayload | null;

  const enabled = dashboard?.automation?.enabled ?? false;
  const tradingAllowed = dashboard?.engine?.tradingAllowed ?? false;

  const [busy, setBusy] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  /* -------------------------------------------------
TOGGLE AUTOMATION
-------------------------------------------------- */

  async function toggleAutomation() {
    if (busy) return;
    const nextState = !enabled;

    setBusy(true);

    try {
      const res = await fetch("/api/automation/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: nextState }),
      });

      if (!res.ok) {
        throw new Error("Automation toggle failed");
      }

      console.log("[UI] automation toggle:", nextState ? "START" : "STOP");

      /* instant dashboard refresh */
      await refreshDashboard();
    } catch (err) {
      console.error("[UI] automation toggle error:", err);
    } finally {
      setBusy(false);
    }
  }

  /* -------------------------------------------------
UI STATE
-------------------------------------------------- */

  const cpuColor = enabled ? "text-green-400" : "text-red-400";
  const pulse = tradingAllowed ? "animate-pulse" : "";

  return (
    <>
      {/* SETTINGS MODAL */}
      <Modal open={openSettings} onClose={() => setOpenSettings(false)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute top-1/2 left-1/2 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-omega-green border border-neutral-700 rounded-xl p-6 shadow-xl"
        >
          <h2 className="text-2xl font-semibold text-omega-gold mb-4 text-center">
            Settings
          </h2>

          <NotificationsPanel />

          <div className="text-right mt-6">
            <Button
              onClick={() => setOpenSettings(false)}
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
              }}
            >
              Close
            </Button>
          </div>
        </motion.div>
      </Modal>
      {/* HEADER BAR */}
      <div className="sticky top-0 z-50 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-xl px-3 py-2 sm:px-4 sm:py-3 bg-omega-green border border-omega-dark-gold shadow-lg">
            {/* HOME BUTTON */}

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-omega-dark-gold text-omega-gold hover-omega"
            >
              <FiHome size={16} />
            </motion.button>

            {/* TITLE */}

            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-base sm:text-xl md:text-2xl font-semibold text-omega-gold text-center select-none"
            >
              𝛀mega
            </motion.h1>

            {/* RIGHT CONTROLS */}

            <div className="flex justify-end gap-1.5 sm:gap-2">
              {/* ENGINE TOGGLE */}

              <motion.button
                whileTap={{ scale: 0.9 }}
                disabled={busy}
                onClick={toggleAutomation}
                title={enabled ? "Stop trading engine" : "Start trading engine"}
                className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-omega-dark-gold ${cpuColor} ${pulse} hover-omega disabled:opacity-50`}
              >
                <FiCpu size={16} />
              </motion.button>

              {/* SETTINGS */}

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setOpenSettings(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border border-omega-dark-gold text-omega-gold hover-omega"
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
