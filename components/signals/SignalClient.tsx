"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import { runEngineAction } from "@/app/signals/actions/runEngine";
import { deleteSignal } from "@/app/signals/actions/deleteSignal";

import SignalCard from "./SignalCard";
import DeleteModal from "./DeleteModal";

import { motion, AnimatePresence } from "framer-motion";

import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import { usePersistentStateSafe } from "@/app/utils/usePersistentState";
import { Signal } from "@/app/types/signal";

import { AllowedStatus, prettyStatus } from "@/lib/signal/status";
import { normalizeSignalRow } from "@/lib/signal/normalise";
import { formatTimestamp } from "@/app/utils/formatTimestamp";

/* ----------------------------------------------
   LOCAL TYPES
---------------------------------------------- */
type ToastType = "success" | "error" | "info" | "warning";

interface ToastState {
  open: boolean;
  message: string;
  type: ToastType;
}

/* ----------------------------------------------
   FILTER HELPERS
---------------------------------------------- */
const filterBySearch = (signal: Signal, term: string) => {
  if (!term.trim()) return true;
  term = term.toLowerCase();

  return (
    signal.symbol.toLowerCase().includes(term) ||
    signal.status.toLowerCase().includes(term) ||
    signal.type.toLowerCase().includes(term) ||
    signal.direction.toLowerCase().includes(term)
  );
};

const filterByType = (signal: Signal, typeFilter: string) =>
  typeFilter === "all" ? true : signal.type === typeFilter;

const filterByStatus = (signal: Signal, statusFilter: string) =>
  statusFilter === "all" ? true : prettyStatus(signal.status) === statusFilter;

const sortSignals = (a: Signal, b: Signal, sortBy: string) => {
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
    return prettyStatus(a.status).localeCompare(prettyStatus(b.status));
  }

  if (sortBy === "type") {
    return a.type.localeCompare(b.type);
  }

  if (sortBy === "direction") {
    return a.direction.localeCompare(b.direction);
  }

  return 0;
};

/* ----------------------------------------------
   MAIN COMPONENT
---------------------------------------------- */
export default function SignalClient({
  initialSignals,
}: {
  initialSignals: Signal[];
}) {
  const router = useRouter();

  /* ----------------------------------------------
       STATE
  ---------------------------------------------- */
  const [signals, setSignals] = useState<Signal[]>(() =>
    initialSignals.map((s) => ({
      ...normalizeSignalRow(s),
      lastUpdatedFormatted: formatTimestamp(s.updated_at),
    }))
  );

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

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const prevStatus = useRef<Record<number, AllowedStatus>>({});
  const prevPrice = useRef<Record<number, number | null>>({});

  /* ----------------------------------------------
     REFRESH ENGINE
  ---------------------------------------------- */
  async function refresh() {
    try {
      const updated = await runEngineAction();
      if (!Array.isArray(updated)) return;

      const normalised = updated.map((s) => ({
        ...normalizeSignalRow(s),
        lastUpdatedFormatted: formatTimestamp(s.updated_at),
      }));

      normalised.forEach((sig) => {
        const old = prevStatus.current[sig.id];
        const next = sig.status;
        const newPrice = sig.current_price ?? null;

        if (old && old !== next) {
          const type: ToastType = next.includes("TP")
            ? "success"
            : next.includes("SL")
            ? "error"
            : next.includes("EXP")
            ? "warning"
            : "info";

          setToast({
            open: true,
            message: `${sig.symbol}: ${next}`,
            type,
          });
        }

        prevStatus.current[sig.id] = next;
        prevPrice.current[sig.id] = newPrice;
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

  /* ----------------------------------------------
     DELETE SIGNAL
  ---------------------------------------------- */
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

  /* ----------------------------------------------
     FILTER + SORT
  ---------------------------------------------- */
  const visibleSignals = useMemo(() => {
    if (!uiReady) return [];

    return signals
      .filter((s) => filterBySearch(s, search))
      .filter((s) => filterByType(s, filterType))
      .filter((s) => filterByStatus(s, filterStatus))
      .sort((a, b) => sortSignals(a, b, sortBy));
  }, [signals, search, filterType, filterStatus, sortBy, uiReady]);

  if (!uiReady) return null;

  /* ----------------------------------------------
     UI
  ---------------------------------------------- */
  return (
    <main className="max-w-7xl mx-auto w-full p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <motion.h1
          className="text-3xl font-semibold text-omega-gold"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          📁 All Signals
        </motion.h1>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 border border-omega-gold text-omega-gold rounded-md hover:bg-omega-gold/10 transition"
          >
            Dashboard
          </button>

          <button
            onClick={() => router.push("/signals/active")}
            className="px-4 py-2 border border-omega-gold text-omega-gold rounded-md hover:bg-omega-gold/10 transition"
          >
            Active Signals
          </button>

          <button
            onClick={() => router.push("/signals/new")}
            className="px-4 py-2 bg-omega-gold text-omega-green font-semibold rounded-md hover:bg-omega-dark-gold transition"
          >
            + Add Signal
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
        <input
          placeholder="Search symbols, status, type, direction…"
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
          <option value="TP1 HIT">TP1 HIT</option>
          <option value="TP2 HIT">TP2 HIT</option>
          <option value="SL HIT">SL HIT</option>
          <option value="EXPIRED">EXPIRED</option>
          <option value="CLOSED">CLOSED</option>
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
          <option value="direction">Direction</option>
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
