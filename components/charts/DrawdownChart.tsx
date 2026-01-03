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
import { useMemo } from "react";

const omega = {
  gold: "var(--omega-gold)",
  green: "var(--omega-green)",
  grid: "rgba(212,175,55,0.12)",
  danger: "#ff5252",
};

type DrawdownPoint = {
  date: string;
  drawdown: number; // <= 0
};

export default function DrawdownChart({ data }: { data: DrawdownPoint[] }) {
  /* ---------------- sanitize data ---------------- */
  const safeData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter(
      (d) => typeof d.drawdown === "number" && Number.isFinite(d.drawdown)
    );
  }, [data]);

  /* ---------------- derive axis ---------------- */
  const maxDD = useMemo(() => {
    if (safeData.length === 0) return -1;
    return Math.min(
      -1,
      Math.floor(Math.min(...safeData.map((d) => d.drawdown)))
    );
  }, [safeData]);

  if (safeData.length < 2) {
    return (
      <div
        style={{
          height: "clamp(200px, 28vh, 300px)",
          background: omega.green,
          border: "1px solid var(--omega-dark-gold)",
          borderRadius: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: omega.gold,
          fontSize: 12,
          opacity: 0.7,
        }}
      >
        Drawdown data unavailable
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "clamp(220px, 32vh, 340px)", // 🔒 responsive height
        minHeight: 220,
        background: omega.green,
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "0.75rem",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "0.75rem 1rem 0.25rem",
          flexShrink: 0,
        }}
      >
        <h3
          style={{
            fontSize: "clamp(0.75rem, 1.2vw, 0.9rem)",
            fontWeight: 600,
            color: omega.gold,
            opacity: 0.85,
          }}
        >
          ↓ Drawdown (%)
        </h3>
      </div>

      {/* CHART */}
      <div
        style={{
          flex: 1,
          minHeight: 0, // 🔒 flexbox correctness
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={safeData}>
            <CartesianGrid stroke={omega.grid} horizontal vertical={false} />

            <XAxis dataKey="date" hide />

            <YAxis
              stroke={omega.gold}
              tick={{
                fill: omega.gold,
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
              domain={[maxDD, 0]}
              ticks={Array.from({ length: Math.abs(maxDD) + 1 }, (_, i) => -i)}
              tickFormatter={(v) => `${Math.abs(v)}%`}
              width={36} // 🔒 prevents overlap on small screens
            />

            <Tooltip
              formatter={(v: number) => `${Math.abs(v).toFixed(2)}%`}
              contentStyle={{
                background: omega.green,
                border: "1px solid var(--omega-dark-gold)",
                color: omega.gold,
                borderRadius: "0.5rem",
                fontSize: 12,
              }}
              cursor={{ stroke: omega.grid }}
            />

            <Area
              type="monotone"
              dataKey="drawdown"
              stroke={omega.danger}
              fill="rgba(255,82,82,0.25)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
