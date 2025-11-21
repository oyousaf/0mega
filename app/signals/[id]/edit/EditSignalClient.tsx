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

  function showSnack(
    message: string,
    severity: "success" | "error" = "success"
  ) {
    setSnack({ open: true, message, severity });
  }

  // ─────────────────────────────
  // DATE FORMATTING
  // ─────────────────────────────
  const createdAt = new Date(signal.created_at);
  const updatedAt = signal.updated_at ? new Date(signal.updated_at) : null;

  let updatedDisplay = "—";

  if (updatedAt) {
    const now = new Date();
    const diffMs = now.getTime() - updatedAt.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 60) {
      updatedDisplay = "just now";
    } else if (diffMin < 1440) {
      updatedDisplay = `${diffMin} min ago`;
    } else {
      updatedDisplay = `on ${updatedAt.toLocaleDateString()} at ${updatedAt.toLocaleTimeString()}`;
    }
  }

  // ─────────────────────────────
  // STATUS CHIP COLOUR
  // ─────────────────────────────
  const statusLower = signal.status.toLowerCase();
  const statusColor = statusLower.includes("tp")
    ? "#56AE57"
    : statusLower.includes("sl")
    ? "#C23B22"
    : statusLower.includes("pending")
    ? "#8e8e8e"
    : "#789FCC";

  // ─────────────────────────────
  // UPDATE HANDLER
  // ─────────────────────────────
  async function handleUpdate(formData: Partial<Signal>) {
    try {
      await updateSignal(signal.id, formData);
      showSnack("Signal updated successfully.");
    } catch {
      showSnack("Failed to update signal.", "error");
    }
  }

  // ─────────────────────────────
  // DELETE HANDLER
  // ─────────────────────────────
  async function handleDelete() {
    try {
      await deleteSignal(signal.id);

      showSnack("Signal deleted.");

      setTimeout(() => {
        router.replace("/signals", { scroll: false });
      }, 300);
    } catch {
      showSnack("Failed to delete signal.", "error");
    }
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto w-full p-6 space-y-10"
    >
      {/* Breadcrumbs */}
      <div className="text-sm text-foreground opacity-70">
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
      <Box className="bg-omega-green border border-omega-dark-gold rounded-lg p-4 space-y-3 shadow-md">
        <div className="flex items-center gap-3">
          <Chip
            label={signal.status.toUpperCase()}
            sx={{
              background: statusColor,
              color: "#fff",
              fontWeight: 700,
              px: 1,
            }}
          />

          {signal.halaal && (
            <Chip
              label="Halaal ✓"
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
                fontWeight: 700,
              }}
            />
          )}
        </div>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)" }} />

        <p className="text-foreground opacity-80 text-sm">
          <strong>Created:</strong> {createdAt.toLocaleString()}
        </p>

        <p className="text-foreground opacity-80 text-sm">
          <strong>Updated:</strong> {updatedDisplay}
        </p>

        <p className="text-foreground opacity-80 text-sm">
          <strong>Type:</strong> {signal.type?.toUpperCase()}
        </p>
      </Box>

      {/* Form */}
      <SignalForm
        mode="edit"
        initialData={signal}
        submitLabel="Save Changes"
        onSubmit={handleUpdate}
      />

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
        <DialogContent sx={{ opacity: 0.9 }}>
          This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDelete(false)}
            sx={{ color: "var(--omega-gold)" }}
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
