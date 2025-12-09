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
import { Signal } from "@/app/types/signal";

// Canonical → Pretty label
function formatStatusLabel(s: string | null | undefined): string {
  if (!s) return "ACTIVE";
  return s.replace(/_/g, " ").toUpperCase();
}

interface Props {
  signal: Signal & { lastUpdatedFormatted?: string };
  onEdit: () => void;
  onDelete: () => void;
}

export default function SignalCard({ signal, onEdit, onDelete }: Props) {
  const STATUS = formatStatusLabel(signal.status);

  const statusColor = STATUS.includes("TP2")
    ? "#37C86E"
    : STATUS.includes("TP1")
    ? "#56AE57"
    : STATUS.includes("SL")
    ? "#C23B22"
    : STATUS.includes("EXP")
    ? "#A77F35"
    : "#789FCC";

  const hasNotes = signal.notes?.trim && signal.notes.trim().length > 0;

  return (
    <motion.div
      layout="position"
      key={signal.id + STATUS}
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: STATUS.includes("TP") ? 1.02 : 1,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      style={{ cursor: "pointer" }}
    >
      <Card
        sx={{
          backgroundColor: "var(--omega-green)",
          border: "1px solid var(--omega-dark-gold)",
          color: "var(--omega-gold)",
          borderRadius: "0.9rem",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* HEADER */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "var(--omega-gold)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {signal.symbol?.toUpperCase()}

              {/* STATUS PULSE */}
              <motion.span
                key={STATUS}
                initial={{ boxShadow: `0 0 0px ${statusColor}` }}
                animate={{
                  boxShadow: [
                    `0 0 0px ${statusColor}`,
                    `0 0 12px ${statusColor}AA`,
                    `0 0 0px ${statusColor}`,
                  ],
                }}
                transition={{ duration: 1.2, repeat: 1 }}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: statusColor,
                }}
              />

              {signal.strategy && (
                <span
                  style={{
                    fontSize: "0.85rem",
                    opacity: 0.9,
                    fontWeight: 500,
                  }}
                >
                  {signal.strategy.toUpperCase()}
                </span>
              )}
            </Typography>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              {/* DIRECTION BADGE */}
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  px: 1.1,
                  py: 0.4,
                  borderRadius: "6px",
                  border: "1px solid",
                  color: signal.direction === "BUY" ? "#37C86E" : "#C23B22",
                  borderColor:
                    signal.direction === "BUY" ? "#37C86E" : "#C23B22",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {signal.direction}
              </Typography>

              {/* STATUS CHIP */}
              <motion.div
                key={STATUS + "_chip"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <Chip
                  label={STATUS}
                  sx={{
                    backgroundColor: statusColor,
                    color: "#fff",
                    fontWeight: 700,
                  }}
                />
              </motion.div>
            </Box>
          </Box>

          {/* PRICE */}
          <motion.span
            key={signal.current_price}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            style={{
              display: "block",
              fontSize: "1.3rem",
              fontWeight: 700,
              color: "var(--omega-gold)",
              textShadow: "0 0 5px rgba(212,175,55,0.45)",
              marginBottom: "12px",
            }}
          >
            {signal.current_price ?? "—"}
          </motion.span>

          {/* GRID */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1.2,
              fontSize: "0.875rem",
              opacity: 0.9,
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

          {/* NOTES */}
          {hasNotes && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 p-3 rounded-md border border-omega-dark-gold bg-omega-green/40"
              style={{ backdropFilter: "blur(2px)" }}
            >
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  opacity: 0.95,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {signal.notes}
              </Typography>
            </motion.div>
          )}

          {/* UPDATED */}
          <Typography
            variant="caption"
            sx={{ mt: 2, opacity: 0.6, display: "block" }}
          >
            Last updated: {signal.lastUpdatedFormatted ?? "—"}
          </Typography>

          {/* BUTTONS */}
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={onEdit}
              sx={{
                backgroundColor: "var(--omega-gold)",
                color: "var(--omega-green)",
                fontWeight: 700,
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
