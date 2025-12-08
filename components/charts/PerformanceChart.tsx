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
  data: {
    date: string;
    cumulative: number;
  }[];
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full rounded-xl p-4"
      style={{
        height: "340px", // Ensure fixed chart area height
        minHeight: 0,
        background: "var(--omega-green)",
        border: "1px solid var(--omega-dark-gold)",
        boxShadow: "0 0 12px rgba(212,175,55,0.15)",
      }}
    >
      <h2 className="text-xl font-semibold text-omega-gold mb-3">
        📈 Equity Curve
      </h2>

      {/* FIXED: Chart now always has a measurable container */}
      <div style={{ width: "100%", height: "85%", minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted}>
            <CartesianGrid stroke={omega.grid} horizontal vertical={false} />
            <XAxis dataKey="date" stroke={omega.gold} />
            <YAxis stroke={omega.gold} />
            <Tooltip
              contentStyle={{
                background: "var(--omega-green)",
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
