"use client";

import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Chip,
  IconButton,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function SignalCard({ signal, onEdit, onDelete }: any) {
  const {
    id,
    symbol,
    strategy,
    entry_price,
    tp1,
    tp2,
    sl,
    status,
    type,
    halaal,
    current_price,
    created_at,
  } = signal;

  const s = status.toLowerCase();

  const statusColor = s.includes("tp")
    ? "#56AE57"
    : s.includes("sl")
    ? "#C23B22"
    : s.includes("pending")
    ? "#8e8e8e"
    : "#789FCC";

  const glow = s.includes("tp")
    ? "0 0 10px rgba(212,175,55,0.45)"
    : s.includes("sl")
    ? "0 0 12px rgba(194,59,34,0.4)"
    : "0 0 12px rgba(120,159,204,0.25)";

  const timeAgo = (() => {
    const ms = Date.now() - new Date(created_at).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card
        sx={{
          position: "relative",
          overflow: "visible",
          backgroundColor: "var(--omega-green)",
          color: "var(--omega-gold)",
          border: "1px solid var(--omega-dark-gold)",
          borderRadius: "0.9rem",
          boxShadow: glow,
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 0 25px rgba(212,175,55,0.35)",
          },
        }}
      >
        {/* ==== FLOATING ACTION ICONS ==== */}
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 1,
            zIndex: 20,
          }}
        >
          <IconButton
            onClick={() => onEdit(id)}
            sx={{
              backgroundColor: "var(--omega-gold)",
              color: "var(--omega-green)",
              "&:hover": { backgroundColor: "var(--omega-dark-gold)" },
              width: 32,
              height: 32,
            }}
          >
            <EditIcon sx={{ fontSize: 17 }} />
          </IconButton>

          <IconButton
            onClick={() => onDelete(id)}
            sx={{
              backgroundColor: "#C23B22",
              color: "#fff",
              "&:hover": { backgroundColor: "#952516" },
              width: 32,
              height: 32,
            }}
          >
            <DeleteIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {/* ==== HEADER ROW ==== */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1.5}
            pr={10}
          >
            <Typography variant="h6" fontWeight="bold">
              {symbol}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              {halaal && (
                <Chip
                  label="☪"
                  size="small"
                  sx={{
                    backgroundColor: "var(--omega-gold)",
                    color: "var(--omega-green)",
                    fontWeight: 700,
                  }}
                />
              )}

              <Chip
                label={status.toUpperCase()}
                size="medium"
                sx={{
                  backgroundColor: statusColor,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 25,
                }}
              />
            </Stack>
          </Box>

          {/* ==== TIME ==== */}
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              mb: 1,
              display: "block",
              color: "var(--foreground)",
            }}
          >
            {timeAgo}
          </Typography>

          {/* ==== DETAILS ==== */}
          <Typography variant="body2" sx={{ color: "var(--foreground)" }}>
            Current:{" "}
            {current_price ? (
              <AnimatePresence mode="wait">
                <motion.span
                  key={current_price}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  style={{ color: "var(--omega-gold)" }}
                >
                  {current_price}
                </motion.span>
              </AnimatePresence>
            ) : (
              <span style={{ color: "#8e8e8e" }}>—</span>
            )}
          </Typography>

          <Typography variant="body2" sx={{ color: "var(--foreground)" }}>
            Type: <span style={{ color: "var(--omega-gold)" }}>{type?.toUpperCase()}</span>
          </Typography>

          <Typography variant="body2" sx={{ color: "var(--foreground)" }}>
            Strategy: <span style={{ color: "var(--omega-gold)" }}>{strategy}</span>
          </Typography>

          <Typography variant="body2" sx={{ color: "var(--foreground)" }}>
            Entry: <span style={{ color: "var(--omega-gold)" }}>{entry_price}</span>
          </Typography>

          <Typography variant="body2" sx={{ color: "var(--foreground)" }}>
            TP1: <span style={{ color: "var(--omega-gold)" }}>{tp1}</span> •  
            TP2: <span style={{ color: "var(--omega-gold)" }}>{tp2}</span> •  
            SL: <span style={{ color: "var(--omega-gold)" }}>{sl}</span>
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
}
