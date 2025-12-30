"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

interface Props {
  data: { date: string; cumulative: number }[];
}

const omega = {
  gold: "var(--omega-gold)",
  green: "var(--omega-green)",
  grid: "rgba(212,175,55,0.15)",
};

export default function PerformanceChart({ data }: Props) {
  const formatted = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    cumulative: d.cumulative,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        width: "100%",
        height: "100%",
        background: "var(--omega-green)",
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "0.75rem",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div className="px-4 pt-3 pb-1">
        <h2 className="text-xl font-semibold text-omega-gold">
          📈 Equity Curve
        </h2>
      </div>

      {/* CHART VIEWPORT — NO PADDING */}
      <div style={{ flex: 1, minHeight: 0, padding: "0 1rem 1rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted}>
            <CartesianGrid stroke={omega.grid} horizontal vertical={false} />
            <XAxis dataKey="date" stroke={omega.gold} />
            <YAxis stroke={omega.gold} />
            <Tooltip
              contentStyle={{
                background: omega.green,
                border: "1px solid var(--omega-dark-gold)",
                color: omega.gold,
              }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke={omega.gold}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 6,
                stroke: omega.gold,
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
