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

// Global status formatting
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

  const hasNotes =
    signal.notes &&
    typeof signal.notes === "string" &&
    signal.notes.trim().length > 0;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      style={{ cursor: "pointer" }}
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
            transition: "0.25s",
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Header: Symbol + pulse + strategy */}
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
                gap: "4px",
              }}
            >
              {signal.symbol?.toUpperCase()}

              {/* Glow pulse on STATUS change */}
              <motion.span
                key={STATUS}
                initial={{ opacity: 1, boxShadow: `0 0 0px ${statusColor}` }}
                animate={{
                  boxShadow: [
                    `0 0 0px ${statusColor}`,
                    `0 0 10px ${statusColor}AA`,
                    `0 0 0px ${statusColor}`,
                  ],
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 1.2,
                  repeat: 1,
                  ease: "easeInOut",
                }}
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: statusColor,
                  display: "inline-block",
                  marginLeft: "6px",
                }}
              />

              {/* STRATEGY */}
              {signal.strategy && (
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    opacity: 0.9,
                    marginLeft: "2px",
                    color: "var(--omega-gold)",
                  }}
                >
                  {signal.strategy.toUpperCase()}
                </span>
              )}
            </Typography>

            {/* STATUS CHIP */}
            <Chip
              label={STATUS}
              sx={{
                backgroundColor: statusColor,
                color: "#fff",
                fontWeight: 700,
              }}
            />
          </Box>

          {/* CURRENT PRICE */}
          <motion.span
            key={signal.current_price}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            style={{
              display: "block",
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "var(--omega-gold)",
              textShadow: "0 0 6px rgba(212,175,55,0.45)",
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

          {/* NOTES */}
          {hasNotes && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 p-3 rounded-md border border-omega-dark-gold bg-omega-green/40 shadow-sm"
              style={{
                backdropFilter: "blur(2px)",
              }}
            >
              <Typography
                sx={{
                  opacity: 0.95,
                  fontSize: "0.85rem",
                  color: "var(--omega-gold)",
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight: 500,
                }}
              >
                {signal.notes}
              </Typography>
            </motion.div>
          )}

          {/* LAST UPDATED */}
          <Typography
            variant="caption"
            sx={{ display: "block", opacity: 0.6, mt: 2 }}
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
