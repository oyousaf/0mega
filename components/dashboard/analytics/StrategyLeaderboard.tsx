"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box } from "@mui/material";

import { Trade } from "@/app/types/trade";
import StrategyDetailPanel from "./StrategyDetailPanel";
import { omegaAnalytics as omega } from "./theme";

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

    if (entry > 0 && qty > 0) {
      row.pnl += (realised / (entry * qty)) * 100;
    }

    row.rr += safeNum(t.rr);
  }

  return [...map.values()]
    .map((r) => ({
      ...r,
      winRate: r.trades ? (r.wins / r.trades) * 100 : 0,
      rr: r.trades ? r.rr / r.trades : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);
}

export default function StrategyLeaderboard({ trades }: { trades: Trade[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const data = useMemo(() => computeStrategies(trades), [trades]);

  return (
    <Box
      sx={{
        background: omega.bg,
        borderRadius: "1rem",
        padding: "1rem",
        border: `1px solid ${omega.sep}`,
        marginTop: "2rem",
      }}
    >
      <h2 className="text-xl font-semibold text-omega-gold mb-4">
        🔥 Strategy Performance
      </h2>

      <div className="space-y-3">
        {data.map((row) => {
          const open = expanded === row.strategy;

          return (
            <motion.div
              key={row.strategy}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="rounded-lg border border-omega-dark-gold bg-black/40 p-4 cursor-pointer"
              onClick={() =>
                setExpanded(open ? null : row.strategy)
              }
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-omega-gold truncate">
                  {row.strategy}
                </p>
                <span className="text-xs text-omega-gold/70 shrink-0">
                  {row.trades} trades
                </span>
              </div>

              {/* Metrics */}
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div className="text-omega-gold">
                  Win
                  <span className="ml-1 font-semibold">
                    {row.winRate.toFixed(1)}%
                  </span>
                </div>

                <div className="text-omega-gold text-center">
                  PnL
                  <span className="ml-1 font-semibold">
                    {row.pnl.toFixed(2)}%
                  </span>
                </div>

                <div className="text-omega-gold text-right">
                  RR
                  <span className="ml-1 font-semibold">
                    {row.rr.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Expand */}
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4"
                  >
                    <StrategyDetailPanel
                      strategy={row.strategy}
                      trades={trades}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </Box>
  );
}
