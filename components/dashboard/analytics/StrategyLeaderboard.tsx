"use client";

import { useMemo, useState, Fragment } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
} from "@mui/material";

import { Trade } from "@/app/types/trade";
import StrategyDetailPanel from "./StrategyDetailPanel";
import { omegaAnalytics as omega } from "./theme";

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

function safeNum(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function computeStrategies(trades: Trade[]): StrategySummary[] {
  const map = new Map<string, StrategySummary>();

  for (const t of trades) {
    const strat = (t.strategy && t.strategy.trim()) || "Unknown";

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

    const realised = safeNum(t.realised_pl);
    const entry = safeNum(t.entry_price);
    const qty = safeNum(t.qty);

    if (realised > 0) row.wins++;
    if (realised < 0) row.losses++;

    // PnL % contribution
    if (entry > 0 && qty > 0) {
      const pct = (realised / (entry * qty)) * 100;
      row.pnl += pct;
    }

    // RR accumulation
    row.rr += safeNum(t.rr);
  }

  return [...map.values()].map((r) => ({
    ...r,
    winRate: r.trades ? (r.wins / r.trades) * 100 : 0,
    rr: r.trades ? r.rr / r.trades : 0,
  }));
}

export default function StrategyLeaderboard({ trades }: { trades: Trade[] }) {
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<keyof StrategySummary>("winRate");
  const [expanded, setExpanded] = useState<string | null>(null);

  const data = useMemo(() => computeStrategies(trades), [trades]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const A = a[orderBy];
      const B = b[orderBy];

      if (typeof A === "number" && typeof B === "number") {
        return order === "asc" ? A - B : B - A;
      }

      return order === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
  }, [data, order, orderBy]);

  return (
    <Box
      sx={{
        background: omega.bg,
        borderRadius: "1rem",
        padding: "1.2rem",
        border: `1px solid ${omega.sep}`,
        marginTop: "2rem",
      }}
    >
      <h2 className="text-xl font-semibold text-omega-gold mb-4">
        🔥 Strategy Performance
      </h2>

      <Table sx={{ minWidth: 650, width: "100%", tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            {["strategy", "trades", "winRate", "pnl", "rr"].map((key) => {
              const k = key as keyof StrategySummary;
              const isActive = orderBy === k;

              return (
                <TableCell
                  key={key}
                  align={k === "strategy" ? "left" : "right"}
                  sx={{ color: omega.text, fontWeight: 600 }}
                >
                  <TableSortLabel
                    active={isActive}
                    direction={isActive ? order : "asc"}
                    onClick={() => {
                      if (orderBy === k) {
                        setOrder(order === "asc" ? "desc" : "asc");
                      } else {
                        setOrderBy(k);
                        setOrder("desc");
                      }
                    }}
                  >
                    {key.toUpperCase()}
                  </TableSortLabel>
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>

        <TableBody>
          {sorted.map((row) => (
            <Fragment key={row.strategy}>
              <motion.tr
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ background: omega.rowHover }}
                onClick={() =>
                  setExpanded(expanded === row.strategy ? null : row.strategy)
                }
                style={{ cursor: "pointer" }}
              >
                <TableCell>{row.strategy}</TableCell>
                <TableCell align="right">{row.trades}</TableCell>
                <TableCell align="right">{row.winRate.toFixed(1)}%</TableCell>
                <TableCell align="right">{row.pnl.toFixed(2)}%</TableCell>
                <TableCell align="right">{row.rr.toFixed(2)}</TableCell>
              </motion.tr>

              {expanded === row.strategy && (
                <motion.tr
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <TableCell colSpan={5}>
                    <StrategyDetailPanel
                      strategy={row.strategy}
                      trades={trades}
                    />
                  </TableCell>
                </motion.tr>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
