"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useElementSize } from "@/hooks/useElementSize";

interface Props {
  data: { date: string; cumulative: number }[];
}

const omega = {
  gold: "var(--omega-gold)",
  green: "var(--omega-green)",
  grid: "rgba(212,175,55,0.15)",
};

export default function PerformanceChart({ data }: Props) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const formatted = useMemo(
    () =>
      data.map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
        cumulative: d.cumulative,
      })),
    [data]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        width: "100%",
        height: "100%",
        background: omega.green,
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "0.75rem",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="px-4 pt-3 pb-1">
        <h2 className="text-xl font-semibold text-omega-gold">
          📈 Equity Curve
        </h2>
      </div>

      <div ref={ref} style={{ flex: 1, padding: "0 1rem 1rem" }}>
        {size.width > 0 && size.height > 0 && (
          <LineChart
            width={size.width}
            height={size.height}
            data={formatted}
          >
            <CartesianGrid stroke={omega.grid} horizontal vertical={false} />
            <XAxis
              dataKey="date"
              stroke={omega.gold}
              tick={{ fill: omega.gold, fontSize: 11 }}
            />
            <YAxis
              stroke={omega.gold}
              tick={{ fill: omega.gold, fontSize: 11 }}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: omega.green,
                border: "1px solid var(--omega-dark-gold)",
                color: omega.gold,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke={omega.gold}
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        )}
      </div>
    </motion.div>
  );
}
