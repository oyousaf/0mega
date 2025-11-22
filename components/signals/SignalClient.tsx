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

  /**
   * Main refresh cycle
   */
  async function refresh() {
    try {
      // Call server action
      const updated = await runEngineAction();

      // Detect status changes → toast alerts
      updated.forEach((sig: any) => {
        const prev = prevStatuses.current[sig.id];

        if (prev && prev !== sig.status) {
          setToast({
            open: true,
            message: `${sig.symbol}: ${sig.status}`,
            type: sig.status.includes("TP")
              ? "success"
              : sig.status.includes("SL")
              ? "error"
              : sig.status === "EXPIRED"
              ? "warning"
              : "info",
          });
        }

        prevStatuses.current[sig.id] = sig.status;
      });

      setSignals(updated);

      setSignals(updated);
    } catch (err) {
      console.error("Engine error:", err);
    }
  }

  /**
   * Start interval
   */
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  /**
   * Delete handler
   */
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
      {/* Header */}
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

      {/* Signal Cards */}
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
                signal={signal}
                onEdit={() => router.push(`/signals/${signal.id}/edit`)}
                onDelete={() => setDeleteId(signal.id)}
              />
            </motion.div>
          ))
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <DeleteModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      {/* Toast */}
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
