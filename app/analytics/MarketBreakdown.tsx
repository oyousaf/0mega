"use client";

import { Signal } from "@/app/types/signal";
import { omegaAnalytics as omega } from "./theme";
import { motion } from "framer-motion";
import { Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// -----------------------------------------
// Compute Market Summary
// -----------------------------------------
function computeMarketBreakdown(signals: Signal[]) {
  const markets = ["crypto", "forex", "stock"] as const;

  return markets.map((m) => {
    const rows = signals.filter((s) => s.type === m);
    const total = rows.length;
    const wins = rows.filter((s) => s.tp1_hit || s.tp2_hit).length;

    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return {
      market: m.toUpperCase(),
      total,
      winRate,
    };
  });
}

export default function MarketBreakdown({ signals }: { signals: Signal[] }) {
  const data = computeMarketBreakdown(signals);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Box
        sx={{
          background: omega.bg,
          border: omega.cardBorder,
          boxShadow: omega.cardShadow,
          borderRadius: "1rem",
          padding: "1.5rem",
          marginTop: "2rem",
          color: omega.text,
        }}
      >
        <h2 className="text-xl font-semibold text-omega-gold mb-3">
          📈 Market Breakdown
        </h2>

        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={data} barSize={32}>
              <XAxis
                dataKey="market"
                tick={{ fill: omega.text }}
                axisLine={{ stroke: omega.sep }}
                tickLine={{ stroke: omega.sep }}
              />
              <YAxis
                tick={{ fill: omega.text }}
                axisLine={{ stroke: omega.sep }}
                tickLine={{ stroke: omega.sep }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: omega.bg,
                  border: `1px solid ${omega.sep}`,
                  borderRadius: "0.5rem",
                  color: omega.text,
                }}
              />
              <Bar dataKey="winRate">
                {data.map((entry, i) => {
                  const green = "#4CAF50";
                  const amber = "#FFC107";
                  const red = "#FF5252";

                  const colour =
                    entry.winRate >= 60
                      ? green
                      : entry.winRate >= 40
                      ? amber
                      : red;

                  return <Cell key={i} fill={colour} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* FOOTER METRICS */}
        <div className="flex justify-center gap-6 mt-4 text-sm opacity-80">
          {data.map((d) => (
            <div key={d.market} className="text-center">
              <p className="font-semibold">{d.market}</p>
              <p>{d.total} trades</p>
              <p>{d.winRate}% win rate</p>
            </div>
          ))}
        </div>
      </Box>
    </motion.div>
  );
}
