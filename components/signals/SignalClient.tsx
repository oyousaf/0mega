"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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

// Canonical → Pretty Label
function prettyStatus(s: string | null | undefined): string {
  if (!s) return "ACTIVE";
  return s.replace(/_/g, " ").toUpperCase();
}

export default function SignalClient({
  initialSignals,
}: {
  initialSignals: Signal[];
}) {
  type ToastType = "success" | "error" | "info" | "warning";

  const router = useRouter();

  /* -----------------------------------------------------
     STATE
  ----------------------------------------------------- */
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Sorting
  const [sortBy, setSortBy] = useState("updated");

  // Toast state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: ToastType;
  }>({
    open: false,
    message: "",
    type: "info",
  });

  // Track last-known status/price
  const prevStatus = useRef<Record<number, string>>({});
  const prevPrice = useRef<Record<number, number | null>>({});

  /* -----------------------------------------------------
     ENGINE REFRESH
  ----------------------------------------------------- */
  async function refresh() {
    try {
      const updated = await runEngineAction();
      if (!Array.isArray(updated) || updated.length === 0) return;

      const normalised = updated.map((s) => ({
        ...s,
        status: prettyStatus(s.status),
        lastUpdatedFormatted: formatTimestamp(s.updated_at),
      }));

      // Toast on status change
      normalised.forEach((sig) => {
        const id = sig.id;
        const newStatus = sig.status;
        const newPrice = sig.current_price ?? null;

        const oldStatus = prevStatus.current[id];

        const statusChanged =
          oldStatus !== undefined && newStatus !== oldStatus;

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
     FILTER + SORT LOGIC
  ----------------------------------------------------- */
  const filteredSignals = useMemo(() => {
    let list = signals
      .filter((s) => {
        if (!search.trim()) return true;
        const t = search.toLowerCase();
        return (
          s.symbol.toLowerCase().includes(t) ||
          s.status.toLowerCase().includes(t) ||
          s.type.toLowerCase().includes(t)
        );
      })
      .filter((s) => {
        if (filterType === "all") return true;
        return s.type === filterType;
      })
      .filter((s) => {
        if (filterStatus === "all") return true;
        return prettyStatus(s.status) === filterStatus;
      });

    // ---- SORTING ----
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "updated":
          return (
            new Date(b.updated_at || 0).getTime() -
            new Date(a.updated_at || 0).getTime()
          );

        case "created":
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );

        case "symbol":
          return a.symbol.localeCompare(b.symbol);

        case "status":
          return prettyStatus(a.status).localeCompare(prettyStatus(b.status));

        default:
          return 0;
      }
    });

    return list;
  }, [signals, search, filterType, filterStatus, sortBy]);

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

      {/* FILTER + SORT BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
        {/* SEARCH */}
        <input
          placeholder="Search symbols, status, type…"
          className="px-4 py-2 rounded-md bg-omega-green border border-omega-dark-gold text-omega-gold focus:outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* TYPE */}
        <select
          className="px-4 py-2 rounded-md bg-omega-green border border-omega-dark-gold text-omega-gold"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="stock">Stocks</option>
          <option value="crypto">Crypto</option>
          <option value="forex">Forex</option>
        </select>

        {/* STATUS */}
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
          <option value="INVALID">INVALID</option>
        </select>

        {/* SORT */}
        <select
          className="px-4 py-2 rounded-md bg-omega-green border border-omega-dark-gold text-omega-gold"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="updated">Sort: Last Updated</option>
          <option value="created">Sort: Created At</option>
          <option value="symbol">Sort: Symbol</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>

      {/* SIGNAL CARDS */}
      <AnimatePresence mode="popLayout">
        {filteredSignals.length === 0 ? (
          <motion.p
            className="text-foreground opacity-70 text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            No matching signals.
          </motion.p>
        ) : (
          filteredSignals.map((signal) => (
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
