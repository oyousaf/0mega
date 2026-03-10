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

  /* ---------------------------------------
  Sanitize dataset
  --------------------------------------- */

  const safeData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data.filter(
      (d) => typeof d.drawdown === "number" && Number.isFinite(d.drawdown),
    );
  }, [data]);

  /* ---------------------------------------
  Determine max drawdown scale
  --------------------------------------- */

  const maxDD = useMemo(() => {
    if (!safeData.length) return -1;

    const min = Math.min(...safeData.map((d) => d.drawdown));

    return Math.floor(Math.min(-1, min));
  }, [safeData]);

  /* ---------------------------------------
  Chart
  --------------------------------------- */

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
      <div style={{ padding: "0.75rem 1rem 0.25rem", textAlign: "center" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: omega.gold }}>
          📉 Drawdown (%)
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
              width={40}
              tickFormatter={(v: any) =>
                Number.isFinite(v) ? `${Math.abs(Number(v))}%` : "—"
              }
            />

            <Tooltip
              formatter={(v: any) =>
                Number.isFinite(v) ? `${Math.abs(Number(v)).toFixed(2)}%` : "—"
              }
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
              strokeLinecap="round"
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </div>
    </div>
  );
}
