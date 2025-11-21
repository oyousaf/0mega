"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Box, Button, Typography, Modal } from "@mui/material";

export default function DeleteModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <Modal open onClose={onClose}>
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.25 }}
            sx={{
              backgroundColor: "var(--omega-green)",
              border: "1px solid var(--omega-dark-gold)",
              color: "var(--omega-gold)",
              maxWidth: "420px",
              mx: "auto",
              mt: "20vh",
              p: 4,
              borderRadius: "0.75rem",
              boxShadow: "0 0 35px rgba(212,175,55,0.25)",
            }}
          >
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Delete Signal?
            </Typography>

            <Typography
              variant="body2"
              sx={{ opacity: 0.8, mb: 3, color: "var(--foreground)" }}
            >
              This action cannot be undone.
            </Typography>

            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                onClick={onClose}
                disabled={loading}
                sx={{
                  borderColor: "var(--omega-gold)",
                  color: "var(--omega-gold)",
                  "&:hover": {
                    borderColor: "var(--omega-dark-gold)",
                    backgroundColor: "rgba(212,175,55,0.15)",
                  },
                }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                onClick={onConfirm}
                disabled={loading}
                sx={{
                  backgroundColor: "#C23B22",
                  color: "#fff",
                  fontWeight: 600,
                  "&:hover": {
                    backgroundColor: "#a8321a",
                  },
                }}
              >
                {loading ? "Deleting..." : "Delete"}
              </Button>
            </Box>
          </Box>
        </Modal>
      )}
    </AnimatePresence>
  );
}
