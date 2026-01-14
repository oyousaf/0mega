"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Box } from "@mui/material";

import { Trade } from "@/app/types/trade";
import { omegaAnalytics as omega } from "./theme";

interface SymbolSummary {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
}

/* ----------------------------------------------------------
   AGGREGATION
---------------------------------------------------------- */
function computeSymbols(trades: Trade[]): SymbolSummary[] {
  const map = new Map<string, SymbolSummary>();

  for (const t of trades) {
    const symbol = (t.symbol && t.symbol.trim()) || "Unknown";

    if (!map.has(symbol)) {
      map.set(symbol, {
        symbol,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
      });
    }

    if (t.realised_pl == null) continue;

    const pl = Number(t.realised_pl);
    if (!Number.isFinite(pl) || pl === 0) continue;

    const row = map.get(symbol)!;
    row.trades++;
    if (pl > 0) row.wins++;
    if (pl < 0) row.losses++;
  }

  return [...map.values()]
    .map((r) => ({
      ...r,
      winRate: r.trades ? (r.wins / r.trades) * 100 : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);
}

/* ----------------------------------------------------------
   COMPONENT
---------------------------------------------------------- */
export default function SymbolLeaderboard({ trades }: { trades: Trade[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const data = useMemo(() => computeSymbols(trades), [trades]);

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
        📊 Symbol Performance
      </h2>

      <div className="space-y-3">
        {data.map((row, index) => {
          const open = expanded === row.symbol;

          return (
            <motion.div
              key={row.symbol}
              layout
              className="rounded-lg border border-omega-dark-gold bg-black/40 p-4 cursor-pointer"
              onClick={() => setExpanded(open ? null : row.symbol)}
            >
              {/* HEADER */}
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-omega-gold truncate">
                  {index + 1}. {row.symbol}
                </p>

                <span className="text-xs text-omega-gold/70 shrink-0">
                  {row.trades} trades
                </span>
              </div>

              {/* METRICS */}
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div className="text-omega-gold">
                  Win
                  <span className="ml-1 font-semibold">
                    {row.winRate.toFixed(1)}%
                  </span>
                </div>

                <div className="text-omega-gold sm:text-center">
                  Wins
                  <span className="ml-1 font-semibold">{row.wins}</span>
                </div>

                <div className="text-omega-gold sm:text-right">
                  Losses
                  <span className="ml-1 font-semibold">{row.losses}</span>
                </div>
              </div>

              {/* EXPAND DETAILS */}
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 text-sm text-omega-gold/80"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        Total Trades
                        <span className="ml-1 font-semibold">{row.trades}</span>
                      </div>

                      <div className="text-right">
                        Win Rate
                        <span className="ml-1 font-semibold">
                          {row.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
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
