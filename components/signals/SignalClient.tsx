"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

import { runEngineAction } from "@/app/signals/actions/runEngine";
import { deleteSignal } from "@/app/signals/actions/deleteSignal";

import SignalCard from "./SignalCard";
import DeleteModal from "./DeleteModal";

import { motion, AnimatePresence } from "framer-motion";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import { formatTimestamp } from "@/app/utils/formatTimestamp";
import { usePersistentStateSafe } from "@/app/utils/usePersistentState";
import { Signal } from "@/app/types/signal";

/* -----------------------------------------------------
   STRICT STATUS NORMALISATION
----------------------------------------------------- */
const ALLOWED_STATUSES = [
  "ACTIVE",
  "TP1 HIT",
  "TP2 HIT",
  "SL HIT",
  "EXPIRED",
  "CLOSED",
] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

/** Convert DB → Pretty, but strongly typed */
function pretty(raw: string | null | undefined): AllowedStatus {
  const formatted = (raw || "ACTIVE").replace(/_/g, " ").toUpperCase();

  if (ALLOWED_STATUSES.includes(formatted as AllowedStatus)) {
    return formatted as AllowedStatus;
  }

  return "ACTIVE";
}

/* -----------------------------------------------------
   COMPONENT
----------------------------------------------------- */
export default function SignalClient({
  initialSignals,
}: {
  initialSignals: Signal[];
}) {
  const router = useRouter();

  type ToastType = "success" | "error" | "info" | "warning";

  /* -----------------------------------------------------
     MAIN STATE
  ----------------------------------------------------- */
  const [signals, setSignals] = useState<Signal[]>(() =>
    initialSignals.map((s) => ({
      ...s,
      status: pretty(s.status),
      lastUpdatedFormatted: formatTimestamp(s.updated_at),
    }))
  );

  /* -----------------------------------------------------
     HYDRATION PERSISTENT FILTERS
  ----------------------------------------------------- */
  const [search, setSearch, hyd1] = usePersistentStateSafe("sig.search", "");
  const [filterType, setFilterType, hyd2] = usePersistentStateSafe(
    "sig.filterType",
    "all"
  );
  const [filterStatus, setFilterStatus, hyd3] = usePersistentStateSafe(
    "sig.filterStatus",
    "all"
  );
  const [sortBy, setSortBy, hyd4] = usePersistentStateSafe(
    "sig.sortBy",
    "updated"
  );

  const uiReady = hyd1 && hyd2 && hyd3 && hyd4;

  /* -----------------------------------------------------
     DELETE STATE
  ----------------------------------------------------- */
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* -----------------------------------------------------
     TOAST STATE
  ----------------------------------------------------- */
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: ToastType;
  }>({ open: false, message: "", type: "info" });

  const prevStatus = useRef<Record<number, AllowedStatus>>({});
  const prevPrice = useRef<Record<number, number | null>>({});

  /* -----------------------------------------------------
     REFRESH ENGINE
  ----------------------------------------------------- */
  async function refresh() {
    try {
      const updated = await runEngineAction();
      if (!Array.isArray(updated) || updated.length === 0) return;

      const normalised = updated
        .map((s) => ({
          ...s,
          status: pretty(s.status),
          lastUpdatedFormatted: formatTimestamp(s.updated_at),
        }))
        .filter((s) => s.status !== "CLOSED");

      // TOAST EVENTS
      normalised.forEach((sig) => {
        const { id, status: newStatus } = sig;
        const newPrice = sig.current_price ?? null;
        const oldStatus = prevStatus.current[id];

        if (oldStatus && oldStatus !== newStatus) {
          const type: ToastType = newStatus.includes("TP")
            ? "success"
            : newStatus.includes("SL")
            ? "error"
            : newStatus.includes("EXP")
            ? "warning"
            : "info";

          setToast({
            open: true,
            message: `${sig.symbol}: ${newStatus}`,
            type,
          });
        }

        prevStatus.current[id] = newStatus;
        prevPrice.current[id] = newPrice;
      });

      setSignals(normalised);
    } catch (err) {
      console.error("Engine refresh error:", err);
    }
  }

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
     FILTER + SORT
  ----------------------------------------------------- */
  const visibleSignals = useMemo(() => {
    if (!uiReady) return [];

    const term = search.toLowerCase();

    return signals
      .filter((s) => {
        if (!term.trim()) return true;
        return (
          s.symbol.toLowerCase().includes(term) ||
          s.status.toLowerCase().includes(term) ||
          s.type.toLowerCase().includes(term)
        );
      })
      .filter((s) => (filterType === "all" ? true : s.type === filterType))
      .filter((s) =>
        filterStatus === "all" ? true : pretty(s.status) === filterStatus
      )
      .sort((a, b) => {
        if (sortBy === "updated") {
          return (
            new Date(b.updated_at ?? 0).getTime() -
            new Date(a.updated_at ?? 0).getTime()
          );
        }
        if (sortBy === "created") {
          return (
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
          );
        }
        if (sortBy === "status") {
          return a.status.localeCompare(b.status);
        }
        if (sortBy === "type") {
          return a.type.localeCompare(b.type);
        }
        return 0;
      });
  }, [signals, search, filterType, filterStatus, sortBy, uiReady]);

  /* -----------------------------------------------------
     HYDRATION GATE
  ----------------------------------------------------- */
  if (!uiReady) return null;

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

      {/* FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
        <input
          placeholder="Search symbols, status, type…"
          className="px-4 py-2 rounded-md bg-omega-green border border-omega-dark-gold text-omega-gold focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="px-4 py-2 rounded-md bg-omega-green border border-omega-dark-gold text-omega-gold"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="stock">Stock</option>
          <option value="crypto">Crypto</option>
          <option value="forex">Forex</option>
        </select>

        <select
          className="px-4 py-2 rounded-md bg-omega-green border border-omega-dark-gold text-omega-gold"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INVALID">INVALID</option>
        </select>

        <select
          className="px-4 py-2 rounded-md bg-omega-green border border-omega-dark-gold text-omega-gold"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="updated">Last Updated</option>
          <option value="created">Newest First</option>
          <option value="status">Status</option>
          <option value="type">Type</option>
        </select>
      </div>

      {/* SIGNAL LIST */}
      <AnimatePresence mode="popLayout">
        {visibleSignals.length === 0 ? (
          <motion.p
            className="text-foreground opacity-70 text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            No matching signals.
          </motion.p>
        ) : (
          visibleSignals.map((signal) => (
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
