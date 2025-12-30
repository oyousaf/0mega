"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DrawdownChart({
  data,
}: {
  data: { date: string; drawdown: number }[];
}) {
  return (
    <div style={{ width: "100%", height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <XAxis dataKey="date" hide />
          <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ff5252"
            fill="rgba(255,82,82,0.35)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
