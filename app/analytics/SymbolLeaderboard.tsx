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
import { omegaAnalytics as omega } from "./theme";

type Order = "asc" | "desc";

interface SymbolSummary {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

interface HeadCell {
  key: keyof SymbolSummary;
  label: string;
  numeric?: boolean;
}

function computeSymbols(signals: Signal[]): SymbolSummary[] {
  const map = new Map<string, SymbolSummary>();

  for (const s of signals) {
    const sym = s.symbol || "Unknown";

    if (!map.has(sym)) {
      map.set(sym, {
        symbol: sym,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
      });
    }

    const row = map.get(sym)!;
    row.trades++;

    if (s.tp2_hit || s.tp1_hit) row.wins++;
    if (s.sl_hit) row.losses++;
  }

  return [...map.values()].map((r) => ({
    ...r,
    winRate: r.trades ? (r.wins / r.trades) * 100 : 0,
  }));
}

export default function SymbolLeaderboard({ signals }: { signals: Signal[] }) {
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<keyof SymbolSummary>("winRate");

  const data = useMemo(() => computeSymbols(signals), [signals]);

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
    { key: "symbol", label: "Symbol" },
    { key: "trades", label: "Trades", numeric: true },
    { key: "winRate", label: "Win Rate %", numeric: true },
  ];

  const handleSort = (key: keyof SymbolSummary) => {
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
        📊 Symbol Performance
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
                      "& .MuiTableSortLabel-label": {
                        color: isActive ? omega.text : "rgba(212,175,55,0.55)",
                        fontWeight: isActive ? 700 : 600,
                      },
                      "&:hover .MuiTableSortLabel-label": {
                        color: omega.text,
                      },
                      "& .MuiTableSortLabel-icon": {
                        color: omega.text,
                      },
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
            {sorted.map((row, i) => (
              <motion.tr
                key={row.symbol}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                whileHover={{ backgroundColor: omega.rowHover }}
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
                    {row.symbol}
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
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </Box>
  );
}
