"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box } from "@mui/material";

import { Trade } from "@/types/trade";
import StrategyDetailPanel from "./StrategyDetailPanel";
import { omegaAnalytics as omega } from "./theme";
import { fmtPrice } from "@/lib/format";

/* ---------------------------------------
UTILS
--------------------------------------- */

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* Default strategy name */
function strategyName(s?: string | null) {
  return s?.trim() || "Structure";
}

/*
Prefer RR when available.
Fallback to risk calculation.
*/
function pnlPct(t: Trade): number | null {
  const realised = num(t.realised_pl);
  if (!realised) return null;

  const rr = num(t.rr);
  if (rr) return rr * 100;

  const entry = num(t.entry_price);
  const sl = num(t.sl);
  const qty = num(t.qty);

  const risk = Math.abs(entry - sl) * qty;

  if (risk <= 0) return null;

  return (realised / risk) * 100;
}

/* ---------------------------------------
TYPES
--------------------------------------- */

interface StrategySummary {
  strategy: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  rr: number;
  expectancy: number;
  profitFactor: number;
}

/* ---------------------------------------
COMPUTE
--------------------------------------- */

function computeStrategies(trades: Trade[]): StrategySummary[] {
  const map = new Map<
    string,
    {
      strategy: string;
      trades: number;
      wins: number;
      losses: number;

      pnlTotal: number;
      pnlCount: number;

      rrTotal: number;
      rrCount: number;

      grossProfit: number;
      grossLoss: number;
    }
  >();

  for (const t of trades) {
    if (!t.is_closed) continue;

    const realised = num(t.realised_pl);
    if (!realised) continue;

    const strat = strategyName(t.strategy);

    if (!map.has(strat)) {
      map.set(strat, {
        strategy: strat,
        trades: 0,
        wins: 0,
        losses: 0,

        pnlTotal: 0,
        pnlCount: 0,

        rrTotal: 0,
        rrCount: 0,

        grossProfit: 0,
        grossLoss: 0,
      });
    }

    const row = map.get(strat)!;

    row.trades++;

    if (realised > 0) {
      row.wins++;
      row.grossProfit += realised;
    } else {
      row.losses++;
      row.grossLoss += Math.abs(realised);
    }

    const rr = num(t.rr);
    if (rr) {
      row.rrTotal += rr;
      row.rrCount++;
    }

    const pnl = pnlPct(t);

    if (pnl !== null) {
      row.pnlTotal += pnl;
      row.pnlCount++;
    }
  }

  return [...map.values()]
    .map((r) => {
      const winRate = r.trades ? (r.wins / r.trades) * 100 : 0;

      const avgRR = r.rrCount ? r.rrTotal / r.rrCount : 0;

      const pnl = r.pnlCount ? r.pnlTotal / r.pnlCount : 0;

      const lossRate = 1 - r.wins / (r.trades || 1);

      const expectancy = (r.wins / (r.trades || 1)) * avgRR - lossRate * 1;

      const profitFactor =
        r.grossLoss > 0 ? r.grossProfit / r.grossLoss : r.grossProfit;

      return {
        strategy: r.strategy,
        trades: r.trades,
        wins: r.wins,
        losses: r.losses,
        winRate,
        pnl,
        rr: avgRR,
        expectancy,
        profitFactor,
      };
    })
    .sort((a, b) => b.expectancy - a.expectancy);
}

/* ---------------------------------------
COMPONENT
--------------------------------------- */

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
      {" "}
      <h2 className="text-xl font-semibold text-omega-gold mb-4 text-center">
        🔥 Strategy Performance{" "}
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
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-omega-gold truncate">
                  {row.strategy}
                </p>

                <span className="text-xs text-omega-gold/70">
                  {row.trades} trades
                </span>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-2 text-sm">
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

                <div className="text-omega-gold text-center">
                  RR <span className="font-semibold">{fmtPrice(row.rr)}</span>
                </div>

                <div className="text-omega-gold text-center">
                  Exp{" "}
                  <span className="font-semibold">
                    {fmtPrice(row.expectancy)}R
                  </span>
                </div>

                <div className="text-omega-gold text-right">
                  PF{" "}
                  <span className="font-semibold">
                    {fmtPrice(row.profitFactor)}
                  </span>
                </div>
              </div>

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
