"use client";

import { useMemo, useState, Fragment } from "react";
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
import { omegaAnalytics as omega } from "./theme";
import StrategyDetailPanel from "./StrategyDetailPanel";

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

    if (s.tp2_hit || s.tp1_hit) row.wins++;
    if (s.sl_hit) row.losses++;

    if (s.entry_price !== null && s.exit_price !== null) {
      const delta = ((s.exit_price - s.entry_price) / s.entry_price) * 100;
      row.pnl += delta;
    }

    if (s.entry_price && s.sl && s.tp1) {
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

export default function StrategyLeaderboard({
  signals,
}: {
  signals: Signal[];
}) {
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<keyof StrategySummary>("winRate");
  const [expanded, setExpanded] = useState<string | null>(null);

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

        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <h2 className="text-xl font-semibold text-omega-gold mb-4">
        🔥 Strategy Performance
      </h2>

      <Table
        sx={{
          minWidth: 650,
          width: "100%",
          tableLayout: "fixed",
        }}
      >
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

                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",

                    maxWidth: 100,
                    "@media (max-width: 480px)": {
                      maxWidth: 85,
                    },
                  }}
                >
                  <TableSortLabel
                    active={isActive}
                    direction={isActive ? order : "asc"}
                    onClick={() => handleSort(h.key)}
                    IconComponent={() => (
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
                    }}
                  >
                    {h.label}
                  </TableSortLabel>
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>

        <TableBody>
          <AnimatePresence initial={false}>
            {sorted.map((row, idx) => (
              <Fragment key={row.strategy}>
                <motion.tr
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: idx * 0.03,
                  }}
                  whileHover={{ backgroundColor: omega.rowHover }}
                  onClick={() =>
                    setExpanded(expanded === row.strategy ? null : row.strategy)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <TableCell
                    sx={{
                      color: omega.text,
                      background: omega.row,
                      borderBottom: `1px solid ${omega.sep}`,

                      maxWidth: 110,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",

                      "@media (max-width: 480px)": {
                        maxWidth: 80,
                      },
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="opacity-60">{idx + 1}.</span>

                      <span className="truncate max-w-24 block">
                        {row.strategy}
                      </span>

                      {idx === 0 && (
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

                <AnimatePresence>
                  {expanded === row.strategy && (
                    <motion.tr
                      key={row.strategy + "-expanded"}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <TableCell colSpan={5} sx={{ padding: 0 }}>
                        <StrategyDetailPanel
                          strategy={row.strategy}
                          signals={signals}
                        />
                      </TableCell>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </Fragment>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </Box>
  );
}
