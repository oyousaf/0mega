"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

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

import SignalForm from "@/components/signals/SignalForm";
import { deleteSignal } from "@/app/signals/actions/deleteSignal";
import { updateSignal } from "@/app/signals/actions/updateSignal";
import { Signal } from "@/app/types/signal";

// Format "X minutes ago"
function timeAgo(dateString: string | Date) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH === 1 ? "" : "s"} ago`;

  const diffD = Math.floor(diffH / 24);
  return `${diffD} day${diffD === 1 ? "" : "s"} ago`;
}

export default function EditSignalClient({ signal }: { signal: Signal }) {
  const router = useRouter();

  // Delete modal
  const [openDelete, setOpenDelete] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Animation state for form submission pulse
  const [submitted, setSubmitted] = useState(false);

  function showSnack(message: string, severity: "success" | "error") {
    setSnack({ open: true, message, severity });
  }

  // Auto-refresh updated "X minutes ago"
  const [updatedAgo, setUpdatedAgo] = useState(
    signal.updated_at ? timeAgo(signal.updated_at) : "—"
  );

  useEffect(() => {
    if (!signal.updated_at) return;
    const interval = setInterval(() => {
      setUpdatedAgo(timeAgo(signal.updated_at!));
    }, 30_000);
    return () => clearInterval(interval);
  }, [signal.updated_at]);

  const statusLower = signal.status.toLowerCase();
  const statusColor = statusLower.includes("tp")
    ? "#4CAF50"
    : statusLower.includes("sl")
    ? "#C62828"
    : statusLower.includes("pending")
    ? "#9E9E9E"
    : "#1976D2";

  async function handleUpdate(formData: Partial<Signal>) {
    try {
      await updateSignal(signal.id, formData);

      // Trigger animation glow
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 1200);

      showSnack("Signal updated successfully.", "success");
      setTimeout(() => router.push("/signals"), 900);
    } catch (err) {
      showSnack("Failed to update signal.", "error");
    }
  }

  async function handleDelete() {
    try {
      await deleteSignal(signal.id);
      showSnack("Signal deleted.", "success");
      setTimeout(() => router.push("/signals"), 900);
    } catch {
      showSnack("Failed to delete signal.", "error");
    }
  }

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
          Edit Signal: {signal.symbol}
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
      <motion.div
        animate={
          submitted
            ? { boxShadow: "0 0 30px rgba(212,175,55,0.5)" }
            : { boxShadow: "0 0 0px rgba(0,0,0,0)" }
        }
        transition={{ duration: 0.6 }}
      >
        <Box className="bg-omega-green border border-omega-dark-gold rounded-lg p-4 space-y-3 shadow-md">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status chip */}
            <Chip
              label={signal.status.toUpperCase()}
              sx={{
                background: statusColor,
                color: "#fff",
                fontWeight: 700,
                px: 1.5,
                py: 0.5,
                letterSpacing: "0.5px",
                boxShadow: "0 0 10px rgba(0,0,0,0.25)",
              }}
            />

            {/* Halaal chip */}
            {signal.halaal && (
              <Chip
                label="HALAAL ✓"
                sx={{
                  backgroundColor: "var(--omega-gold)",
                  color: "var(--omega-green)",
                  fontWeight: 800,
                  px: 1.8,
                  py: 0.6,
                  letterSpacing: "0.7px",
                  boxShadow: "0 0 12px rgba(212,175,55,0.45)",
                }}
              />
            )}
          </div>

          <Divider sx={{ borderColor: "var(--omega-dark-gold)" }} />

          <p className="text-sm text-foreground opacity-80">
            <strong>Created:</strong>{" "}
            {new Date(signal.created_at).toLocaleString()}
          </p>

          <p className="text-sm text-foreground opacity-80">
            <strong>Updated:</strong> {signal.updated_at ? updatedAgo : "—"}
          </p>

          <p className="text-sm text-foreground opacity-80">
            <strong>Type:</strong> {signal.type?.toUpperCase()}
          </p>
        </Box>
      </motion.div>

      {/* Signal Form */}
      <SignalForm
        mode="edit"
        initialData={signal}
        submitLabel="Save Changes"
        onSubmit={handleUpdate}
      />

      {/* Delete Modal */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Delete Signal?</DialogTitle>
        <DialogContent sx={{ color: "#333" }}>
          This action cannot be undone. Are you sure?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={async () => {
              await handleDelete();
            }}
          >
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
            backgroundColor:
              snack.severity === "success"
                ? "var(--omega-gold)"
                : "rgba(200,0,0,0.85)",
            color: snack.severity === "success" ? "var(--omega-green)" : "#fff",
            fontWeight: 700,
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </motion.main>
  );
}
