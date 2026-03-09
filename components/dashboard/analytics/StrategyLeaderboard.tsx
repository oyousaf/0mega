"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box } from "@mui/material";

import { Trade } from "@/types/trade";
import StrategyDetailPanel from "./StrategyDetailPanel";
import { omegaAnalytics as omega } from "./theme";
import { fmtPrice } from "@/lib/format";

interface StrategySummary {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  rr: number;
}

function safeNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeStrategies(trades: Trade[]): StrategySummary[] {
  const map = new Map<
    string,
    StrategySummary & { rrTotal: number; rrCount: number }
  >();

  for (const t of trades) {
    if (!t.is_closed) continue;

    const realised = safeNum(t.realised_pl);
    if (!realised) continue;

    const strat = t.strategy?.trim() || "Unknown";

    if (!map.has(strat)) {
      map.set(strat, {
        strategy: strat,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        pnl: 0,
        rr: 0,
        rrTotal: 0,
        rrCount: 0,
      });
    }

    const row = map.get(strat)!;

    row.trades++;

    if (realised > 0) row.wins++;
    else row.losses++;

    const entry = safeNum(t.entry_price);
    const qty = safeNum(t.qty);

    if (entry > 0 && qty > 0) {
      row.pnl += (realised / (entry * qty)) * 100;
    }

    const rr = safeNum(t.rr);
    if (rr) {
      row.rrTotal += rr;
      row.rrCount++;
    }
  }

  return [...map.values()]
    .map((r) => ({
      strategy: r.strategy,
      trades: r.trades,
      wins: r.wins,
      losses: r.losses,
      winRate: r.trades ? (r.wins / r.trades) * 100 : 0,
      pnl: r.trades ? r.pnl / r.trades : 0,
      rr: r.rrCount ? r.rrTotal / r.rrCount : 0,
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
      }}
    >
      <h2 className="text-xl font-semibold text-omega-gold mb-4 text-center">
        🔥 Strategy Performance
      </h2>

      <div className="space-y-3">
        {data.map((row) => {
          const open = expanded === row.strategy;

          return (
            <motion.div
              key={row.strategy}
              layout
              className="rounded-lg border border-omega-dark-gold bg-black/40 p-4 cursor-pointer"
              onClick={() => setExpanded(open ? null : row.strategy)}
            >
              {/* HEADER */}
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-omega-gold truncate">
                  {row.strategy}
                </p>

                <span className="text-xs text-omega-gold/70">
                  {row.trades} trades
                </span>
              </div>

              {/* METRICS */}
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div className="text-omega-gold">
                  Win{" "}
                  <span className="font-semibold">
                    {fmtPrice(row.winRate)}%
                  </span>
                </div>

                <div className="text-omega-gold text-center">
                  PnL{" "}
                  <span className="font-semibold">{fmtPrice(row.pnl)}%</span>
                </div>

                <div className="text-omega-gold text-right">
                  RR <span className="font-semibold">{fmtPrice(row.rr)}</span>
                </div>
              </div>

              {/* EXPAND PANEL */}
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
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
