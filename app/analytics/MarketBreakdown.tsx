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

function computeMarketBreakdown(signals: Signal[]) {
  const markets = ["crypto", "forex", "stock"] as const;

  return markets.map((m) => {
    const rows = signals.filter((s) => s.type === m);
    const total = rows.length;
    const wins = rows.filter((s) => s.tp1_hit || s.tp2_hit).length;
    return {
      market: m.toUpperCase(),
      total,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    };
  });
}

export default function MarketBreakdown({ signals }: { signals: Signal[] }) {
  const data = computeMarketBreakdown(signals);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ width: "100%", height: "100%" }}
    >
      <Box
        sx={{
          background: omega.bg,
          border: omega.cardBorder,
          boxShadow: omega.cardShadow,
          borderRadius: "1rem",
          padding: "1.5rem",
          color: omega.text,
          width: "100%",
          height: "100%",
        }}
      >
        <h2 className="text-xl font-semibold text-omega-gold mb-3">
          📈 Market Breakdown
        </h2>

        <div style={{ width: "100%", height: "70%" }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 320, height: 200 }}
          >
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
                {data.map((entry) => {
                  const colour =
                    entry.winRate >= 60
                      ? "#4CAF50"
                      : entry.winRate >= 40
                      ? "#FFC107"
                      : "#FF5252";

                  return <Cell key={entry.market} fill={colour} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

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
