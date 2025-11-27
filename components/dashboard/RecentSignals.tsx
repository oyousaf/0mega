"use client";

import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { motion } from "framer-motion";
import Link from "next/link";

import { Signal } from "@/app/types/signal";
import { formatTimestamp } from "@/app/utils/formatTimestamp";

/** Colour logic for Chip */
function statusColour(status: string) {
  const s = status.toLowerCase();

  if (s.includes("tp")) return "#56AE57";
  if (s.includes("sl")) return "#C23B22";
  if (s.includes("exp")) return "#D99A00";
  return "#789FCC";
}

export default function RecentSignals({ signals }: { signals: Signal[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card
        sx={{
          backgroundColor: "var(--omega-green)",
          border: "1px solid var(--omega-dark-gold)",
          borderRadius: "0.75rem",
          color: "var(--omega-gold)",
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            🕒 Recent Signals
          </Typography>

          {signals.length === 0 ? (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              No recent signals found.
            </Typography>
          ) : (
            <Box className="space-y-3">
              {signals.map((sig) => (
                <motion.div
                  key={sig.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex justify-between items-center p-2 rounded-lg border border-[var(--omega-dark-gold)]"
                >
                  <div className="flex flex-col">
                    <Typography fontWeight={600}>{sig.symbol}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {formatTimestamp(sig.created_at)}
                    </Typography>
                  </div>

                  <Chip
                    label={sig.status}
                    size="small"
                    sx={{
                      backgroundColor: statusColour(sig.status),
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                </motion.div>
              ))}
            </Box>
          )}

          <Box className="flex justify-end mt-3">
            <Link href="/signals">
              <Typography
                variant="body2"
                sx={{
                  color: "var(--omega-gold)",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                View All →
              </Typography>
            </Link>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}
