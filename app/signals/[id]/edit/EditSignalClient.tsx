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
import { formatTimestamp } from "@/app/utils/formatTimestamp";

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

  // timestamps
  const created = new Date(signal.created_at);
  const updated = signal.updated_at ? new Date(signal.updated_at) : null;

  // STATUS
  const STATUS = signal.status?.toUpperCase() ?? "ACTIVE";

  const statusColor = STATUS.includes("TP2")
    ? "#37C86E"
    : STATUS.includes("TP1")
    ? "#56AE57"
    : STATUS.includes("SL")
    ? "#C23B22"
    : STATUS.includes("EXP")
    ? "#A77F35"
    : "#789FCC";

  // UPDATE HANDLER
  async function handleUpdate(data: Partial<Signal>) {
    try {
      const res = await updateSignal(signal.id, data);

      if (!res.ok) {
        showSnack(res.error || "Update failed", "error");
        return;
      }

      showSnack("Signal updated successfully.", "success");
    } catch {
      showSnack("Failed to update signal.", "error");
    }
  }

  // DELETE HANDLER
  async function handleDelete() {
    try {
      await deleteSignal(signal.id);
      showSnack("Signal deleted.");
      router.replace("/signals");
    } catch {
      showSnack("Failed to delete signal.", "error");
    }
  }

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
          <strong>Updated:</strong> {updated ? formatTimestamp(updated) : "—"}
        </p>

        <p className="text-sm text-foreground/80">
          <strong>Type:</strong> {signal.type?.toUpperCase()}
        </p>
      </Box>

      {/* FORM */}
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
