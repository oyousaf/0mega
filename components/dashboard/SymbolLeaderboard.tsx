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
} from "@mui/material";
import { motion } from "framer-motion";
import { DashboardMetrics } from "@/lib/metrics";

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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card
        sx={{
          backgroundColor: "var(--omega-green)",
          border: "1px solid var(--omega-dark-gold)",
          color: "var(--omega-gold)",
          borderRadius: "0.75rem",
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight="bold" mb={2}>
            🔥 Symbol Performance Leaderboard
          </Typography>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "var(--omega-gold)" }}>
                  Symbol
                </TableCell>
                <TableCell sx={{ color: "var(--omega-gold)" }}>Win %</TableCell>
                <TableCell sx={{ color: "var(--omega-gold)" }}>Wins</TableCell>
                <TableCell sx={{ color: "var(--omega-gold)" }}>
                  Losses
                </TableCell>
                <TableCell sx={{ color: "var(--omega-gold)" }}>
                  Expectancy
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.symbol}
                  sx={{
                    "&:hover": { backgroundColor: "rgba(212,175,55,0.1)" },
                  }}
                >
                  <TableCell sx={{ color: "var(--omega-gold)" }}>
                    {row.symbol}
                  </TableCell>
                  <TableCell sx={{ color: "var(--omega-gold)" }}>
                    {row.winRate}%
                  </TableCell>
                  <TableCell sx={{ color: "var(--omega-gold)" }}>
                    {row.wins}
                  </TableCell>
                  <TableCell sx={{ color: "var(--omega-gold)" }}>
                    {row.losses}
                  </TableCell>
                  <TableCell
                    sx={{ color: row.expectancy >= 0 ? "#6CFFB5" : "#C23B22" }}
                  >
                    {row.expectancy}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
