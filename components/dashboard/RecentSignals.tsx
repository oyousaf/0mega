"use client";

import { Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { motion } from "framer-motion";
import Link from "next/link";

type Signal = {
  id: number;
  symbol: string;
  status: string;
  created_at: string;
  halaal?: boolean;
};

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
                  <Typography fontWeight={600}>{sig.symbol}</Typography>

                  <Chip
                    label={sig.status.toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: sig.status.toLowerCase().includes("tp")
                        ? "#56AE57"
                        : sig.status.toLowerCase().includes("sl")
                        ? "#C23B22"
                        : "#789FCC",
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
