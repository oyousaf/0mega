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
} from "@mui/material";
import { useRouter } from "next/navigation";

import SignalForm from "@/components/signals/SignalForm";
import { deleteSignal } from "@/app/signals/actions/deleteSignal";
import { updateSignal } from "@/app/signals/actions/updateSignal";

export default function EditSignalClient({ signal }: { signal: any }) {
  const router = useRouter();
  const [openDelete, setOpenDelete] = useState(false);

  const formattedDate = new Date(signal.created_at).toLocaleString();

  const statusLower = signal.status.toLowerCase();
  const statusColor = statusLower.includes("tp")
    ? "#56AE57"
    : statusLower.includes("sl")
    ? "#C23B22"
    : statusLower.includes("pending")
    ? "#8e8e8e"
    : "#789FCC";

  async function handleUpdate(formData: any) {
    await updateSignal(signal.id, formData);
    router.push("/signals");
  }

  async function handleDelete() {
    await deleteSignal(signal.id);
    router.push("/signals");
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

      {/* Header + Toolbar */}
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
      <Box className="bg-omega-green border border-omega-dark-gold rounded-lg p-4 space-y-2 shadow-md">
        <div className="flex items-center gap-3 text-foreground">
          <Chip
            label={signal.status.toUpperCase()}
            sx={{ background: statusColor, color: "#fff" }}
          />

          {signal.halaal && (
            <Chip
              label="Halaal ✓"
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
                fontWeight: 600,
              }}
            />
          )}
        </div>

        <Divider sx={{ borderColor: "var(--omega-dark-gold)", my: 1 }} />

        <p className="text-foreground opacity-80 text-sm">
          <strong>Created:</strong> {formattedDate}
        </p>

        <p className="text-foreground opacity-80 text-sm">
          <strong>Type:</strong> {signal.type?.toUpperCase()}
        </p>
      </Box>

      {/* Form */}
      <SignalForm
        mode="edit"
        initialData={signal}
        submitLabel="Update Signal"
        onSubmit={handleUpdate}
      />

      {/* Delete Modal */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Delete Signal?</DialogTitle>
        <DialogContent>
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
    </motion.main>
  );
}
