"use client";

import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { motion } from "framer-motion";
import Link from "next/link";
import { Signal } from "@/app/types/signal";
import { formatTimestamp } from "@/app/utils/formatTimestamp";

function statusColour(s: string) {
  const x = s.toLowerCase();
  if (x.includes("tp")) return "#56AE57";
  if (x.includes("sl")) return "#C23B22";
  if (x.includes("exp")) return "#D99A00";
  return "#789FCC";
}

export default function RecentSignals({ signals }: { signals: Signal[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <Card
        sx={{
          backgroundColor: "var(--omega-green)",
          border: "1px solid var(--omega-dark-gold)",
          borderRadius: "0.75rem",
          color: "var(--omega-gold)",
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" fontWeight="bold" mb={1.5}>
            🕒 Recent Signals
          </Typography>

          {signals.length === 0 ? (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              No recent signals found.
            </Typography>
          ) : (
            <Box className="space-y-2.5">
              {signals.map((sig) => (
                <motion.div
                  key={sig.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex justify-between items-center p-2 rounded-lg border border-omega-dark-gold"
                >
                  <div className="flex flex-col leading-tight">
                    <Typography fontWeight={600}>{sig.symbol}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {formatTimestamp(sig.created_at)}
                    </Typography>
                  </div>

                  <Chip
                    label={sig.status.toUpperCase()}
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

          <Box className="flex justify-end mt-2.5">
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
