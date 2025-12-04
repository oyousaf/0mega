"use client";

import { useMemo, useState } from "react";
import { Signal } from "@/app/types/signal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
} from "@mui/material";

type Order = "asc" | "desc";

interface StrategySummary {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  rr: number;
}

interface HeadCell {
  key: keyof StrategySummary;
  label: string;
  numeric?: boolean;
}

// Omega Theme Tokens
const omega = {
  bg: "var(--omega-green)",
  row: "rgba(0,0,0,0.18)",
  sep: "var(--omega-dark-gold)",
  text: "var(--omega-gold)",
  dim: "rgba(212,175,55,0.65)",
  win: "#4CAF50",
  loss: "#FF5252",
  glow: "0 0 12px rgba(212,175,55,0.55)",
};

// ---------- Compute Strategy Summary ----------
function computeStrategies(signals: Signal[]): StrategySummary[] {
  const map = new Map<string, StrategySummary>();

  for (const s of signals) {
    const strat = s.strategy || "Unknown";

    if (!map.has(strat)) {
      map.set(strat, {
        strategy: strat,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        pnl: 0,
        rr: 0,
      });
    }

    const row = map.get(strat)!;
    row.trades++;

    // --- Win / Loss ---
    if (s.tp2_hit || s.tp1_hit) row.wins++;
    if (s.sl_hit) row.losses++;

    // --- PnL ---
    if (s.entry_price !== null && s.exit_price !== null) {
      const delta = ((s.exit_price - s.entry_price) / s.entry_price) * 100;
      row.pnl += delta;
    }

    // --- R:R ---
    if (s.entry_price !== null && s.sl !== null && s.tp1 !== null) {
      const risk = Math.abs(s.entry_price - s.sl);
      const reward = Math.abs(s.tp1 - s.entry_price);
      if (risk > 0) row.rr += reward / risk;
    }
  }

  return [...map.values()].map((r) => ({
    ...r,
    winRate: r.trades ? (r.wins / r.trades) * 100 : 0,
    rr: r.trades ? r.rr / r.trades : 0,
  }));
}

// ---------- Component ----------
export default function StrategyLeaderboard({
  signals,
}: {
  signals: Signal[];
}) {
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<keyof StrategySummary>("winRate");

  const data = useMemo(() => computeStrategies(signals), [signals]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const A = a[orderBy];
      const B = b[orderBy];
      if (A < B) return order === "asc" ? -1 : 1;
      if (A > B) return order === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, order, orderBy]);

  const headCells: HeadCell[] = [
    { key: "strategy", label: "Strategy" },
    { key: "trades", label: "Trades", numeric: true },
    { key: "winRate", label: "Win Rate %", numeric: true },
    { key: "pnl", label: "Total P&L %", numeric: true },
    { key: "rr", label: "Avg R:R", numeric: true },
  ];

  const handleSort = (key: keyof StrategySummary) => {
    if (orderBy === key) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(key);
      setOrder("desc");
    }
  };

  return (
    <Box
      sx={{
        background: omega.bg,
        borderRadius: "1rem",
        padding: "1.2rem",
        border: `1px solid ${omega.sep}`,
        boxShadow: "0 0 14px rgba(212,175,55,0.18)",
        marginTop: "2rem",
      }}
    >
      <h2 className="text-xl font-semibold text-omega-gold mb-4">
        🔥 Strategy Performance
      </h2>

      <Table>
        <TableHead>
          <TableRow>
            {headCells.map((h) => {
              const isActive = orderBy === h.key;

              return (
                <TableCell
                  key={h.key}
                  align={h.numeric ? "right" : "left"}
                  sx={{
                    color: isActive ? omega.text : omega.dim,
                    fontWeight: isActive ? 700 : 600,
                    borderBottom: `1px solid ${omega.sep}`,
                    transition: "all 0.25s ease",
                    textShadow: isActive ? omega.glow : "none",
                  }}
                >
                  <TableSortLabel
                    active={isActive}
                    direction={isActive ? order : "asc"}
                    onClick={() => handleSort(h.key)}
                    IconComponent={(props) => (
                      <motion.span
                        animate={{
                          rotate: isActive && order === "desc" ? 180 : 0,
                        }}
                        transition={{ duration: 0.25 }}
                        style={{ display: "inline-block" }}
                      >
                        ▼
                      </motion.span>
                    )}
                    sx={{
                      color: isActive ? omega.text : omega.dim,
                      "&:hover": { color: omega.text },
                    }}
                  >
                    <motion.span
                      animate={{
                        color: isActive ? omega.text : omega.dim,
                      }}
                      transition={{ duration: 0.25 }}
                    >
                      {h.label}
                    </motion.span>
                  </TableSortLabel>
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>

        <TableBody>
          <AnimatePresence initial={false}>
            {sorted.map((row, i) => (
              <motion.tr
                key={row.strategy}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <TableCell
                  sx={{
                    color: omega.text,
                    background: omega.row,
                    borderBottom: `1px solid ${omega.sep}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="opacity-60">{i + 1}.</span>
                    {row.strategy}
                    {i === 0 && (
                      <span className="px-2 py-0.5 text-xs rounded bg-omega-gold text-omega-green font-bold">
                        TOP
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell
                  align="right"
                  sx={{
                    color: omega.text,
                    background: omega.row,
                    borderBottom: `1px solid ${omega.sep}`,
                  }}
                >
                  {row.trades}
                </TableCell>

                <TableCell
                  align="right"
                  sx={{
                    color: row.winRate >= 50 ? omega.win : omega.loss,
                    background: omega.row,
                    borderBottom: `1px solid ${omega.sep}`,
                  }}
                >
                  {row.winRate.toFixed(1)}%
                </TableCell>

                <TableCell
                  align="right"
                  sx={{
                    color: row.pnl >= 0 ? omega.win : omega.loss,
                    background: omega.row,
                    borderBottom: `1px solid ${omega.sep}`,
                  }}
                >
                  {row.pnl.toFixed(2)}%
                </TableCell>

                <TableCell
                  align="right"
                  sx={{
                    color: omega.text,
                    background: omega.row,
                    borderBottom: `1px solid ${omega.sep}`,
                  }}
                >
                  {row.rr.toFixed(2)}
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </Box>
  );
}
