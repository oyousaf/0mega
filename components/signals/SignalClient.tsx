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

// Pretty status (DB stays canonical)
function formatStatusLabel(s: string | null | undefined): string {
  if (!s) return "ACTIVE";
  return s.replace(/_/g, " ").toUpperCase();
}

// Simple shallow compare (avoids false state updates)
function shallowCompare(a: any, b: any) {
  if (!a || !b) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => a[k] === b[k]);
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
  }>({
    open: false,
    message: "",
    type: "info",
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Keep last-known status + price
  const prevStatus = useRef<Record<number, string>>({});
  const prevPrice = useRef<Record<number, number | null>>({});
  const router = useRouter();

  /* -----------------------------------------------------
     REFRESH ENGINE
  ----------------------------------------------------- */
  async function refresh() {
    try {
      const updatedRaw = await runEngineAction();
      if (!updatedRaw || updatedRaw.length === 0) return;

      // Normalise UI-facing fields before comparison
      const updated = updatedRaw.map((s: any) => ({
        ...s,
        status: formatStatusLabel(s.status),
        lastUpdatedFormatted: formatTimestamp(s.updated_at),
      }));

      // Avoid rerender if identical
      const same =
        updated.length === signals.length &&
        updated.every((u, i) => shallowCompare(u, signals[i]));

      if (same) return;

      // Toast logic
      updated.forEach((sig) => {
        const sId = sig.id;
        const newStatus = sig.status;
        const newPrice = sig.current_price ?? null;

        const oldStatus = prevStatus.current[sId];
        const oldPrice = prevPrice.current[sId];

        const statusChanged = oldStatus && newStatus !== oldStatus;
        const priceChanged = oldPrice !== null && newPrice !== oldPrice;

        if (statusChanged) {
          setToast({
            open: true,
            message: `${sig.symbol}: ${newStatus}`,
            type: newStatus.includes("TP")
              ? "success"
              : newStatus.includes("SL")
              ? "error"
              : newStatus.includes("EXP")
              ? "warning"
              : "info",
          });
        }

        prevStatus.current[sId] = newStatus;
        prevPrice.current[sId] = newPrice;
      });

      setSignals(updated);
    } catch (err) {
      console.error("Engine error:", err);
    }
  }

  /* -----------------------------------------------------
     INTERVAL
  ----------------------------------------------------- */
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  /* -----------------------------------------------------
     DELETE SIGNAL
  ----------------------------------------------------- */
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

  /* -----------------------------------------------------
     UI
  ----------------------------------------------------- */
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
