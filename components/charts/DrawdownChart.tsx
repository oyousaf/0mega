"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";
import { useElementSize } from "@/hooks/useElementSize";

const omega = {
  gold: "var(--omega-gold)",
  green: "var(--omega-green)",
  grid: "rgba(212,175,55,0.12)",
  danger: "#ff5252",
};

type DrawdownPoint = {
  date: string;
  drawdown: number;
};

export default function DrawdownChart({ data }: { data: DrawdownPoint[] }) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const safeData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter(
      (d) => typeof d.drawdown === "number" && Number.isFinite(d.drawdown)
    );
  }, [data]);

  const maxDD = useMemo(() => {
    if (!safeData.length) return -1;
    return Math.min(
      -1,
      Math.floor(Math.min(...safeData.map((d) => d.drawdown)))
    );
  }, [safeData]);

  return (
    <div
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
      <div style={{ padding: "0.75rem 1rem 0.25rem" }}>
        <h3
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: omega.gold,
            opacity: 0.85,
          }}
        >
          ↓ Drawdown (%)
        </h3>
      </div>

      <div ref={ref} style={{ flex: 1, padding: "0 0.75rem 0.75rem" }}>
        {size.width > 0 && size.height > 0 && (
          <AreaChart width={size.width} height={size.height} data={safeData}>
            <CartesianGrid stroke={omega.grid} horizontal vertical={false} />
            <XAxis dataKey="date" hide />
            <YAxis
              stroke={omega.gold}
              tick={{ fill: omega.gold, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[maxDD, 0]}
              ticks={Array.from({ length: Math.abs(maxDD) + 1 }, (_, i) => -i)}
              tickFormatter={(v) => `${Math.abs(v)}%`}
              width={40}
            />
            <Tooltip
              formatter={(v: number) => `${Math.abs(v).toFixed(2)}%`}
              contentStyle={{
                background: omega.green,
                border: "1px solid var(--omega-dark-gold)",
                color: omega.gold,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke={omega.danger}
              fill="rgba(255,82,82,0.25)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        )}
      </div>
    </div>
  );
}
