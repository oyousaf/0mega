"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Box,
} from "@mui/material";

export default function SignalCard({ signal, onEdit, onDelete }: any) {
  const updated = signal.updated_at ? new Date(signal.updated_at) : null;

  const now = new Date();
  let lastUpdated = "—";

  if (updated) {
    const diffMin = Math.floor((now.getTime() - updated.getTime()) / 60000);
    lastUpdated = diffMin < 1 ? "just now" : `${diffMin} min ago`;
  }

  const STATUS = signal.status?.toUpperCase().replace("_", " ") || "ACTIVE";

  const statusColor = STATUS.includes("TP2")
    ? "#37C86E"
    : STATUS.includes("TP1")
    ? "#56AE57"
    : STATUS.includes("SL")
    ? "#C23B22"
    : STATUS.includes("EXP")
    ? "#A77F35"
    : "#789FCC";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <Card
        sx={{
          backgroundColor: "var(--omega-green)",
          border: "1px solid var(--omega-dark-gold)",
          color: "var(--omega-gold)",
          borderRadius: "0.9rem",
          cursor: "pointer",
          "&:hover": {
            boxShadow: "0 0 20px rgba(212,175,55,0.25)",
            transform: "translateY(-3px)",
            transition: "0.25s",
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" fontWeight="700" color="var(--omega-gold)">
              {signal.symbol}
            </Typography>

            <Chip
              label={STATUS}
              sx={{
                backgroundColor: statusColor,
                color: "#fff",
                fontWeight: 700,
              }}
            />
          </Box>

          {/* Info Grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1.2,
              color: "var(--omega-gold)",
              opacity: 0.9,
              fontSize: "0.875rem",
            }}
          >
            <Typography>
              <strong>Entry:</strong> {signal.entry_price}
            </Typography>

            <Typography>
              <strong>TP1:</strong> {signal.tp1}
            </Typography>

            <Typography>
              <strong>TP2:</strong> {signal.tp2}
            </Typography>

            <Typography>
              <strong>SL:</strong> {signal.sl}
            </Typography>
          </Box>

          {/* Footer */}
          <Typography
            variant="caption"
            sx={{ display: "block", opacity: 0.6, mt: 2 }}
          >
            Last updated: {lastUpdated}
          </Typography>

          {/* Buttons */}
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={onEdit}
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
                fontWeight: 700,
                "&:hover": { backgroundColor: "var(--omega-dark-gold)" },
              }}
            >
              Edit
            </Button>

            <Button
              variant="outlined"
              onClick={onDelete}
              sx={{
                borderColor: "#C23B22",
                color: "#C23B22",
                fontWeight: 700,
                "&:hover": {
                  backgroundColor: "rgba(194,59,34,0.2)",
                  borderColor: "#952516",
                },
              }}
            >
              Delete
            </Button>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}
