"use client";

import { omegaAnalytics as omega } from "./theme";
import { motion } from "framer-motion";
import { Box } from "@mui/material";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Trade } from "@/types/trade";
import { fmtPrice } from "@/lib/format";

/* -----------------------------------------
UTILS
----------------------------------------- */

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function strategyName(s?: string | null) {
  return s?.trim() || "Structure";
}

/* -----------------------------------------
PERCENT CALCULATION
----------------------------------------- */

function pnlPct(t: Trade): number | null {
  if (t.realised_pl === null) return null;

  const realised = Number(t.realised_pl);
  const risk = Number(t.risk_amount);

  if (!Number.isFinite(realised) || !Number.isFinite(risk) || risk === 0) {
    return null;
  }

  const r = realised / risk;
  return r * 100;
}

/* -----------------------------------------
COMPONENT
----------------------------------------- */

export default function StrategyDetailPanel({
  strategy,
  trades,
}: {
  strategy: string;
  trades: Trade[];
}) {
  /* same dataset as leaderboard */

  const stratTrades = trades
    .filter((t) => strategyName(t.strategy) === strategy)
    .filter((t) => t.is_closed)
    .sort(
      (a, b) =>
        new Date(b.closed_at ?? b.opened_at).getTime() -
        new Date(a.closed_at ?? a.opened_at).getTime(),
    );

  const last5 = stratTrades.slice(0, 5);

  /* -----------------------------------------
  AVG RR
  ----------------------------------------- */

  const rrList = stratTrades.map((t) => num(t.rr)).filter((v) => v !== 0);

  const avgRR =
    rrList.length > 0 ? rrList.reduce((a, b) => a + b, 0) / rrList.length : 0;

  /* -----------------------------------------
  AVG PNL %
  ----------------------------------------- */

  const pnlValues = stratTrades
    .map((t) => pnlPct(t))
    .filter((v): v is number => v !== null);

  const avgPnL =
    pnlValues.length > 0
      ? pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length
      : 0;

  /* -----------------------------------------
  SPARKLINE
  ----------------------------------------- */

  const sparkline = last5
    .map((t) => {
      const p = pnlPct(t);
      return p !== null ? { value: p } : null;
    })
    .filter((v): v is { value: number } => v !== null);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      style={{ minWidth: 0 }}
    >
      <Box
        sx={{
          background: omega.row,
          borderLeft: `3px solid ${omega.sep}`,
          padding: "1rem",
          marginTop: "0.5rem",
          borderRadius: "0.75rem",
        }}
      >
        {/* METRICS */}

        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div>
            <p className="text-xs" style={{ color: omega.dim }}>
              Avg R:R
            </p>
            <p className="font-bold text-omega-gold text-lg">
              {fmtPrice(avgRR)}
            </p>
          </div>

          <div>
            <p className="text-xs" style={{ color: omega.dim }}>
              Avg PnL %
            </p>
            <p
              className="font-bold text-lg"
              style={{
                color: avgPnL >= 0 ? omega.win : omega.loss,
              }}
            >
              {fmtPrice(avgPnL)}%
            </p>
          </div>

          <div>
            <p className="text-xs" style={{ color: omega.dim }}>
              Trades
            </p>
            <p className="font-bold text-omega-gold text-lg">
              {stratTrades.length}
            </p>
          </div>
        </div>

        {/* SPARKLINE */}

        <div className="w-full h-16 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={omega.text}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* LAST 5 TRADES */}

        <p className="text-sm font-semibold mb-2" style={{ color: omega.text }}>
          Last 5 Trades
        </p>

        {last5.map((t, i) => {
          const pnl = pnlPct(t);

          return (
            <div
              key={t.trade_id ?? `${t.symbol}-${i}`}
              className="flex justify-between text-sm py-1 border-b border-neutral-700"
            >
              <span style={{ color: omega.dim }}>{i + 1}.</span>

              <span
                className="truncate"
                style={{ maxWidth: "90px", color: omega.text }}
              >
                {t.symbol}
              </span>

              <span
                style={{
                  color:
                    pnl !== null
                      ? pnl >= 0
                        ? omega.win
                        : omega.loss
                      : omega.text,
                }}
              >
                {pnl !== null ? `${fmtPrice(pnl)}%` : "—"}
              </span>
            </div>
          );
        })}
      </Box>
    </motion.div>
  );
}
