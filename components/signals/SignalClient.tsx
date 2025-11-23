"use client";

import { useEffect, useState, useRef } from "react";
import { runEngineAction } from "@/app/signals/actions/runEngine";
import SignalCard from "./SignalCard";
import DeleteModal from "./DeleteModal";
import { deleteSignal } from "@/app/signals/actions/deleteSignal";
import { motion, AnimatePresence } from "framer-motion";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { useRouter } from "next/navigation";
import { formatTimestamp } from "@/app/utils/formatTimestamp";
import { Signal } from "@/app/types/signal";

// Global status formatting
function formatStatusLabel(s: string | null | undefined): string {
  if (!s) return "ACTIVE";
  return s.replace(/_/g, " ").toUpperCase();
}

export default function SignalClient({
  initialSignals,
}: {
  initialSignals: Signal[];
}) {
  type ToastType = "success" | "error" | "info" | "warning";

  const [signals, setSignals] = useState<Signal[]>(initialSignals || []);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: ToastType;
  }>({ open: false, message: "", type: "info" });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // store last known statuses for animation + toast triggers
  const prevStatuses = useRef<Record<number, string>>({});

  const router = useRouter();

  // ------------------------------------------------------
  // ENGINE REFRESH
  // ------------------------------------------------------
  async function refresh() {
    try {
      const updated = await runEngineAction();

      updated.forEach((sig: Signal) => {
        const prev = prevStatuses.current[sig.id];
        const formattedStatus = formatStatusLabel(sig.status);

        // Status change toast
        if (prev && prev !== formattedStatus) {
          setToast({
            open: true,
            message: `${sig.symbol}: ${formattedStatus}`,
            type: formattedStatus.includes("TP")
              ? "success"
              : formattedStatus.includes("SL")
              ? "error"
              : formattedStatus.includes("EXP")
              ? "warning"
              : "info",
          });
        }

        // update memory
        prevStatuses.current[sig.id] = formattedStatus;
      });

      setSignals(updated);
    } catch (err) {
      console.error("Engine error:", err);
    }
  }

  // ------------------------------------------------------
  // INTERVAL
  // ------------------------------------------------------
  useEffect(() => {
    refresh(); // initial
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  // ------------------------------------------------------
  // DELETE SIGNAL
  // ------------------------------------------------------
  async function confirmDelete() {
    if (!deleteId) return;

    setDeleting(true);
    await deleteSignal(deleteId);

    setSignals((prev) => prev.filter((s) => s.id !== deleteId));
    setDeleting(false);
    setDeleteId(null);

    setToast({
      open: true,
      message: "Signal deleted",
      type: "success",
    });
  }

  // ------------------------------------------------------
  // UI
  // ------------------------------------------------------
  return (
    <main className="max-w-7xl mx-auto w-full p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <motion.h1
          className="text-3xl font-semibold text-omega-gold"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          📡 Active Signals
        </motion.h1>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 border border-omega-gold text-omega-gold rounded-md hover:bg-omega-gold/10 transition"
          >
            Dashboard
          </button>

          <button
            onClick={() => router.push("/signals/new")}
            className="px-4 py-2 bg-omega-gold text-omega-green font-semibold rounded-md hover:bg-omega-dark-gold transition"
          >
            + Add Signal
          </button>
        </div>
      </div>

      {/* SIGNAL CARDS */}
      <AnimatePresence mode="popLayout">
        {signals.length === 0 ? (
          <motion.p
            className="text-foreground opacity-70 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            No signals found.
          </motion.p>
        ) : (
          signals.map((signal: Signal) => (
            <motion.div
              key={signal.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <SignalCard
                signal={{
                  ...signal,
                  status: formatStatusLabel(signal.status),
                  lastUpdatedFormatted: formatTimestamp(signal.updated_at),
                }}
                onEdit={() => router.push(`/signals/${signal.id}/edit`)}
                onDelete={() => setDeleteId(signal.id)}
              />
            </motion.div>
          ))
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <DeleteModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      {/* TOAST */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.type}
          onClose={() => setToast({ ...toast, open: false })}
          sx={{
            backgroundColor:
              toast.type === "success"
                ? "#56AE57"
                : toast.type === "error"
                ? "#C23B22"
                : toast.type === "warning"
                ? "#D99A00"
                : "#789FCC",
            color: "#fff",
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </main>
  );
}
