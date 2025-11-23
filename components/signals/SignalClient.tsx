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

export default function SignalClient({
  initialSignals,
}: {
  initialSignals: any[];
}) {
  type ToastType = "success" | "error" | "info" | "warning";

  const [signals, setSignals] = useState<any[]>(initialSignals || []);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: ToastType;
  }>({ open: false, message: "", type: "info" });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const prevStatuses = useRef<Record<number, string>>({});

  const router = useRouter();

  // ───────────────────────────────────────────
  // ENGINE REFRESH
  // ───────────────────────────────────────────
  async function refresh() {
    try {
      const updated = await runEngineAction();

      updated.forEach((sig: any) => {
        const prev = prevStatuses.current[sig.id];

        // STATUS CHANGE → toast notification
        if (prev && prev !== sig.status) {
          setToast({
            open: true,
            message: `${sig.symbol}: ${sig.status}`,
            type: sig.status.includes("TP")
              ? "success"
              : sig.status.includes("SL")
              ? "error"
              : sig.status.includes("EXP")
              ? "warning"
              : "info",
          });
        }

        prevStatuses.current[sig.id] = sig.status;
      });

      setSignals(updated);
    } catch (err) {
      console.error("Engine error:", err);
    }
  }

  // ───────────────────────────────────────────
  // INTERVAL
  // ───────────────────────────────────────────
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  // ───────────────────────────────────────────
  // DELETE SIGNAL
  // ───────────────────────────────────────────
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
          signals.map((signal: any) => (
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
