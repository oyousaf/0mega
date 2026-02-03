"use client";

import { omegaAnalytics as omega } from "./theme";
import { motion } from "framer-motion";
import { Box } from "@mui/material";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Trade } from "@/app/types/trade";

/* -----------------------------------------
   SAFE HELPERS
----------------------------------------- */
const num = (v: any) => {
  const n = Number(v);
  return isFinite(n) ? n : 0;
};

const pct = (realised: number, entry: number, qty: number) => {
  if (entry <= 0 || qty <= 0) return null;
  return (realised / (entry * qty)) * 100;
};

export default function StrategyDetailPanel({
  strategy,
  trades,
}: {
  strategy: string;
  trades: Trade[];
}) {
  /* -----------------------------------------
     FILTER BY STRATEGY
  ----------------------------------------- */
  const stratTrades = trades
    .filter((t) => (t.strategy ?? "Unknown") === strategy)
    .filter((t) => t.realised_pl !== null) // ignore open trades for analytics
    .sort(
      (a, b) =>
        new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime(),
    );

  const last5 = stratTrades.slice(0, 5);

  /* -----------------------------------------
     AVG RR
  ----------------------------------------- */
  const rrList = stratTrades.filter((t) => t.rr !== null).map((t) => num(t.rr));

  const avgRR = rrList.length
    ? (rrList.reduce((a, b) => a + b, 0) / rrList.length).toFixed(2)
    : "0.00";

  /* -----------------------------------------
     AVG PNL %
  ----------------------------------------- */
  const pnlList = stratTrades
    .map((t) => pct(num(t.realised_pl), num(t.entry_price), num(t.qty)))
    .filter((v): v is number => v !== null);

  const avgPnL = pnlList.length
    ? (pnlList.reduce((a, b) => a + b, 0) / pnlList.length).toFixed(2)
    : "0.00";

  /* -----------------------------------------
     SPARKLINE (Last 5 trades PNL%)
  ----------------------------------------- */
  const sparkline = last5
    .map((t) => {
      const p = pct(num(t.realised_pl), num(t.entry_price), num(t.qty));
      return p !== null ? { value: Number(p.toFixed(2)) } : null;
    })
    .filter(Boolean) as { value: number }[];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      style={{ minWidth: 0 }}
    >
      <Box
        sx={{
          background: omega.row,
          borderLeft: `3px solid ${omega.sep}`,
          padding: "1rem",
          marginTop: "0.5rem",
          borderRadius: "0.75rem",
          minWidth: 0,
        }}
      >
        {/* METRICS */}
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div>
            <p className="text-xs" style={{ color: omega.dim }}>
              Avg R:R
            </p>
            <p className="font-bold text-omega-gold text-lg">{avgRR}</p>
          </div>

          <div>
            <p className="text-xs" style={{ color: omega.dim }}>
              Avg PnL %
            </p>
            <p
              className="font-bold text-lg"
              style={{
                color: Number(avgPnL) >= 0 ? omega.win : omega.loss,
              }}
            >
              {avgPnL}%
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
          const pnl = pct(num(t.realised_pl), num(t.entry_price), num(t.qty));

          return (
            <div
              key={t.trade_id}
              className="flex justify-between text-sm py-1 border-b border-neutral-700"
            >
              <span style={{ color: omega.dim }}>{i + 1}.</span>

              <span
                className="truncate"
                style={{ maxWidth: "85px", color: omega.text }}
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
                {pnl !== null ? pnl.toFixed(2) + "%" : "--"}
              </span>
            </div>
          );
        })}
      </Box>
    </motion.div>
  );
}
