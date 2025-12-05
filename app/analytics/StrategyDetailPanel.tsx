"use client";

import { Signal } from "@/app/types/signal";
import { omegaAnalytics as omega } from "./theme";
import { motion } from "framer-motion";
import { Box } from "@mui/material";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function StrategyDetailPanel({
  strategy,
  signals,
}: {
  strategy: string;
  signals: Signal[];
}) {
  const stratSignals = signals
    .filter((s) => s.strategy === strategy)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const last5 = stratSignals.slice(0, 5);

  const rrList = stratSignals
    .filter((s) => s.entry_price && s.sl && s.tp1)
    .map((s) => {
      const risk = Math.abs(s.entry_price! - s.sl!);
      const reward = Math.abs(s.tp1! - s.entry_price!);
      return risk > 0 ? reward / risk : 0;
    });

  const pnlList = stratSignals
    .filter((s) => s.entry_price && s.exit_price)
    .map((s) => ((s.exit_price! - s.entry_price!) / s.entry_price!) * 100);

  const avgRR =
    rrList.length > 0 ? (rrList.reduce((a, b) => a + b, 0) / rrList.length).toFixed(2) : "0.00";

  const avgPnL =
    pnlList.length > 0 ? (pnlList.reduce((a, b) => a + b, 0) / pnlList.length).toFixed(2) : "0.00";

  const sparkline = last5
    .map((s) => {
      if (!s.entry_price || !s.exit_price) return null;
      return {
        value: ((s.exit_price - s.entry_price) / s.entry_price) * 100,
      };
    })
    .filter(Boolean) as { value: number }[];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.35 }}
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
            <p className="text-xs" style={{ color: omega.dim }}>Avg R:R</p>
            <p className="font-bold text-omega-gold text-lg">{avgRR}</p>
          </div>

          <div>
            <p className="text-xs" style={{ color: omega.dim }}>Avg PnL %</p>
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
            <p className="text-xs" style={{ color: omega.dim }}>Trades</p>
            <p className="font-bold text-omega-gold text-lg">{stratSignals.length}</p>
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
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: omega.text }}>
            Last 5 Trades
          </p>

          {last5.map((s, i) => (
            <div
              key={s.id}
              className="flex justify-between text-sm py-1 border-b border-neutral-700"
            >
              <span style={{ color: omega.dim }}>{i + 1}.</span>

              <span style={{ color: omega.text }}>{s.symbol}</span>

              <span
                style={{
                  color:
                    s.exit_price && s.entry_price
                      ? s.exit_price > s.entry_price
                        ? omega.win
                        : omega.loss
                      : omega.text,
                }}
              >
                {s.exit_price && s.entry_price
                  ? (((s.exit_price - s.entry_price) / s.entry_price) * 100).toFixed(2) + "%"
                  : "--"}
              </span>
            </div>
          ))}
        </div>
      </Box>
    </motion.div>
  );
}
