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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            {/* LEFT SIDE: Symbol + Dot + Strategy */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: "var(--omega-gold)",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {/* SYMBOL */}
              {signal.symbol?.toUpperCase()}

              {/* GLOW-PULSE STATUS DOT */}
              <motion.span
                key={signal.status}
                initial={{ boxShadow: `0 0 0px ${statusColor}`, opacity: 1 }}
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
                  repeat: 2,
                  ease: "easeInOut",
                }}
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: statusColor,
                  display: "inline-block",
                  margin: "0 4px",
                }}
              ></motion.span>

              {/* STRATEGY — reverted to previous look */}
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  opacity: 0.9,
                  color: "var(--omega-gold)",
                  textTransform: "uppercase",
                }}
              >
                {signal.strategy || ""}
              </span>
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

          {/* =======================================================
              CURRENT PRICE
              ======================================================= */}
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

          {/* =======================================================
              GRID OF ENTRY / TP1 / TP2 / SL
              ======================================================= */}
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

          {/* =======================================================
              LAST UPDATED
              ======================================================= */}
          <Typography
            variant="caption"
            sx={{ display: "block", opacity: 0.6, mt: 2 }}
          >
            Last updated: {signal.lastUpdatedFormatted}
          </Typography>

          {/* =======================================================
              ACTION BUTTONS
              ======================================================= */}
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
