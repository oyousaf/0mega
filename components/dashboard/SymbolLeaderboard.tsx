"use client";

import {
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
} from "@mui/material";
import { motion, easeOut } from "framer-motion";
import { DashboardMetrics } from "@/lib/metrics";

/* ---------------------------------------------
   Subtle Motion Variants
--------------------------------------------- */
const container = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
};

export default function SymbolLeaderboard({
  metrics,
}: {
  metrics: DashboardMetrics;
}) {
  const rows = Object.entries(metrics.bySymbol).map(([symbol, stats]) => ({
    symbol,
    ...stats,
  }));

  if (rows.length === 0) return null;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <Card
        sx={{
          backgroundColor: "var(--omega-green)",
          border: "1px solid var(--omega-dark-gold)",
          borderRadius: "0.85rem",
          color: "var(--omega-gold)",
          overflow: "hidden",
          boxShadow:
            "0 0 20px rgba(212,175,55,0.12), inset 0 0 6px rgba(212,175,55,0.25)",
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            fontWeight="bold"
            mb={2}
            sx={{ color: "var(--omega-gold)" }}
          >
            🔥 Symbol Performance Leaderboard
          </Typography>

          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "rgba(0,0,0,0.15)",
                  }}
                >
                  {["Symbol", "Win %", "Wins", "Losses", "Expectancy"].map(
                    (h) => (
                      <TableCell
                        key={h}
                        sx={{
                          color: "var(--omega-gold)",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          letterSpacing: "0.4px",
                        }}
                      >
                        {h}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow
                    key={row.symbol}
                    sx={{
                      backgroundColor:
                        idx % 2 === 0
                          ? "rgba(212,175,55,0.04)"
                          : "rgba(212,175,55,0.07)",
                      "&:hover": {
                        backgroundColor: "rgba(212,175,55,0.15)",
                        cursor: "pointer",
                      },
                      transition: "background-color 0.25s ease",
                    }}
                  >
                    <TableCell sx={{ color: "var(--omega-gold)" }}>
                      <Typography fontWeight={600}>{row.symbol}</Typography>
                    </TableCell>

                    <TableCell sx={{ color: "var(--omega-gold)" }}>
                      {row.winRate}%
                    </TableCell>

                    <TableCell sx={{ color: "#6CFFB5" }}>{row.wins}</TableCell>

                    <TableCell sx={{ color: "#C23B22" }}>
                      {row.losses}
                    </TableCell>

                    <TableCell
                      sx={{
                        color: row.expectancy >= 0 ? "#6CFFB5" : "#C23B22",
                        fontWeight: 600,
                      }}
                    >
                      {row.expectancy.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}
