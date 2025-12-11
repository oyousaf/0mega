"use client";

import { omegaAnalytics as omega } from "./theme";
import { motion } from "framer-motion";
import { Box } from "@mui/material";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Trade } from "@/app/types/trade";

export default function StrategyDetailPanel({
  strategy,
  trades,
}: {
  strategy: string;
  trades: Trade[];
}) {
  const stratTrades = trades
    .filter((t) => t.strategy === strategy)
    .sort(
      (a, b) =>
        new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
    );

  const last5 = stratTrades.slice(0, 5);

  const rrList = stratTrades
    .filter((t) => t.rr !== null)
    .map((t) => Number(t.rr));

  const pnlList = stratTrades
    .filter((t) => t.realised_pl !== null && t.entry_price !== null)
    .map((t) => {
      const pct = (Number(t.realised_pl) / (t.entry_price * t.qty)) * 100;
      return pct;
    });

  const avgRR =
    rrList.length > 0
      ? (rrList.reduce((a, b) => a + b, 0) / rrList.length).toFixed(2)
      : "0.00";

  const avgPnL =
    pnlList.length > 0
      ? (pnlList.reduce((a, b) => a + b, 0) / pnlList.length).toFixed(2)
      : "0.00";

  const sparkline = last5
    .map((t) => {
      if (t.realised_pl === null) return null;
      const pct = (t.realised_pl / (t.entry_price * t.qty)) * 100;
      return { value: pct };
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

        {last5.map((t, i) => (
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
                  Number(t.realised_pl) > 0
                    ? omega.win
                    : Number(t.realised_pl) < 0
                    ? omega.loss
                    : omega.text,
              }}
            >
              {t.realised_pl !== null
                ? ((t.realised_pl / (t.entry_price * t.qty)) * 100).toFixed(2) +
                  "%"
                : "--"}
            </span>
          </div>
        ))}
      </Box>
    </motion.div>
  );
}
