"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  Divider,
  Box,
  Snackbar,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";

import SignalForm from "@/components/signals/SignalForm";
import { deleteSignal } from "@/app/signals/actions/deleteSignal";
import { updateSignal } from "@/app/signals/actions/updateSignal";
import { Signal } from "@/app/types/signal";

export default function EditSignalClient({ signal }: { signal: Signal }) {
  const router = useRouter();

  const [openDelete, setOpenDelete] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  function showSnack(msg: string, sev: "success" | "error" = "success") {
    setSnack({ open: true, message: msg, severity: sev });
  }

  // ─────────────────────────────
  // DATE HANDLING
  // ─────────────────────────────
  const created = new Date(signal.created_at);
  const updated = signal.updated_at ? new Date(signal.updated_at) : null;

  function fmtTime(date: Date | null) {
    if (!date) return "—";

    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;

    return date.toLocaleString();
  }

  // ─────────────────────────────
  // STATUS STYLE
  // ─────────────────────────────
  const STATUS = signal.status?.toUpperCase() || "ACTIVE";

  const statusColor = STATUS.includes("TP2")
    ? "#37C86E"
    : STATUS.includes("TP1")
    ? "#56AE57"
    : STATUS.includes("SL")
    ? "#C23B22"
    : STATUS.includes("EXP")
    ? "#A77F35"
    : "#789FCC";

  // ─────────────────────────────
  // UPDATE SIGNAL
  // ─────────────────────────────
  async function handleUpdate(data: Partial<Signal>) {
    try {
      await updateSignal(signal.id, data);
      showSnack("Signal updated successfully.");
    } catch {
      showSnack("Failed to update signal.", "error");
    }
  }

  // ─────────────────────────────
  // DELETE SIGNAL
  // ─────────────────────────────
  async function handleDelete() {
    try {
      await deleteSignal(signal.id);
      router.replace("/signals");
      showSnack("Signal deleted.");
    } catch {
      showSnack("Failed to delete signal.", "error");
    }
  }

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full space-y-10 p-6"
    >
      {/* Breadcrumbs */}
      <div className="text-sm text-foreground/70">
        <Link href="/signals" className="hover:underline">
          Signals
        </Link>{" "}
        / <span className="text-omega-gold">Edit</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-omega-gold">
          Edit: {signal.symbol}
        </h1>

        <div className="flex gap-3">
          <Link href="/signals">
            <Button
              variant="outlined"
              sx={{
                borderColor: "var(--omega-gold)",
                color: "var(--omega-gold)",
                fontWeight: 600,
                "&:hover": { borderColor: "var(--omega-dark-gold)" },
              }}
            >
              Back
            </Button>
          </Link>

          <Button
            variant="contained"
            color="error"
            onClick={() => setOpenDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Box
        className="rounded-xl shadow-md"
        sx={{
          backgroundColor: "var(--omega-green)",
          border: "1px solid var(--omega-dark-gold)",
          p: 4,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Chip
            label={STATUS.replace("_", " ")}
            sx={{
              backgroundColor: statusColor,
              color: "#fff",
              fontWeight: 700,
            }}
          />

          {signal.halaal && (
            <Chip
              label="HALAAL"
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
                fontWeight: 700,
              }}
            />
          )}
        </div>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", mb: 3 }} />

        <p className="text-sm text-foreground/80">
          <strong>Created:</strong> {created.toLocaleString()}
        </p>

        <p className="text-sm text-foreground/80">
          <strong>Updated:</strong> {fmtTime(updated)}
        </p>

        <p className="text-sm text-foreground/80">
          <strong>Type:</strong> {signal.type?.toUpperCase()}
        </p>
      </Box>

      {/* Edit Form — now spaced beautifully */}
      <div className="pt-4">
        <SignalForm
          mode="edit"
          initialData={signal}
          submitLabel="Save Changes"
          onSubmit={handleUpdate}
        />
      </div>

      {/* Delete Modal */}
      <Dialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        PaperProps={{
          sx: {
            backgroundColor: "var(--omega-green)",
            border: "1px solid var(--omega-dark-gold)",
            color: "var(--omega-gold)",
          },
        }}
      >
        <DialogTitle>Delete Signal?</DialogTitle>
        <DialogContent>This action cannot be undone.</DialogContent>
        <DialogActions>
          <Button
            sx={{ color: "var(--omega-gold)" }}
            onClick={() => setOpenDelete(false)}
          >
            Cancel
          </Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          sx={{
            bgcolor:
              snack.severity === "success"
                ? "var(--omega-gold)"
                : "rgba(220,0,0,0.8)",
            color: snack.severity === "success" ? "var(--omega-green)" : "#fff",
            fontWeight: 600,
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </motion.main>
  );
}
