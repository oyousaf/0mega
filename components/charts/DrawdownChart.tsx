"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const omega = {
  gold: "var(--omega-gold)",
  green: "var(--omega-green)",
  grid: "rgba(212,175,55,0.12)",
  danger: "#ff5252",
};

export default function DrawdownChart({
  data,
}: {
  data: { date: string; drawdown: number }[];
}) {
  return (
    <div
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
        <h3 className="text-sm font-semibold text-omega-gold opacity-80">
          ↓ Drawdown (%)
        </h3>
      </div>

      {/* CHART VIEWPORT — NO PADDING */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid stroke={omega.grid} horizontal vertical={false} />

            <XAxis dataKey="date" hide />

            <YAxis
              tickFormatter={(v) => `${Math.abs(v).toFixed(0)}%`}
              stroke={omega.gold}
              tick={{ fill: omega.gold, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              formatter={(v: number) => `${Math.abs(v).toFixed(2)}%`}
              contentStyle={{
                background: omega.green,
                border: "1px solid var(--omega-dark-gold)",
                color: omega.gold,
                borderRadius: "0.5rem",
              }}
            />

            <Area
              type="monotone"
              dataKey="drawdown"
              stroke={omega.danger}
              fill="rgba(255,82,82,0.25)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                stroke: omega.danger,
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
