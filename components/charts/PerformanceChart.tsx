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

type EquityPoint = {
  date: string;
  cumulative: number;
};

interface Props {
  data: EquityPoint[];
}

const omega = {
  gold: "var(--omega-gold)",
  green: "var(--omega-green)",
  grid: "rgba(212,175,55,0.15)",
};

function fmtShortDate(iso: string, compact: boolean) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleDateString(
    "en-GB",
    compact
      ? { day: "2-digit", month: "2-digit" }
      : { day: "2-digit", month: "short" },
  );
}

function fmtMoney(v: number) {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

export default function PerformanceChart({ data }: Props) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const compact = size.width > 0 && size.width < 520;

  const formatted = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data.map((d) => ({
      date: fmtShortDate(d.date, compact),
      cumulative: Number(d.cumulative) || 0,
    }));
  }, [data, compact]);

  const tickCount = compact ? 3 : 6;
  const yWidth = compact ? 40 : 56;

  return (
    <motion.div
      role="img"
      aria-label="Account equity over time"
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
      <div style={{ padding: "0.75rem 1rem 0.25rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: omega.gold }}>
          📈 Equity Curve
        </h2>
      </div>

      <div ref={ref} style={{ flex: 1, padding: "0 1rem 1rem" }}>
        {formatted.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-omega-gold opacity-60">
            No closed-trade data yet
          </div>
        )}
        {formatted.length > 0 && size.width > 0 && size.height > 0 && (
          <LineChart
            width={size.width}
            height={size.height}
            data={formatted}
            margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={omega.grid} horizontal vertical={false} />

            <XAxis
              dataKey="date"
              stroke={omega.gold}
              tick={{ fill: omega.gold, fontSize: compact ? 10 : 11 }}
              interval="preserveStartEnd"
              minTickGap={compact ? 18 : 28}
              tickCount={tickCount}
            />

            <YAxis
              stroke={omega.gold}
              tick={{ fill: omega.gold, fontSize: compact ? 10 : 11 }}
              width={yWidth}
              tickFormatter={fmtMoney}
            />

            <Tooltip
              contentStyle={{
                background: omega.green,
                border: "1px solid var(--omega-dark-gold)",
                color: omega.gold,
                fontSize: 12,
              }}
              formatter={(v: unknown) => [`£${fmtMoney(Number(v))}`, "Equity"]}
            />

            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="rgba(212,175,55,0.25)"
              strokeWidth={6}
              dot={false}
              strokeLinecap="round"
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="cumulative"
              stroke={omega.gold}
              strokeWidth={2.2}
              dot={false}
              strokeLinecap="round"
              activeDot={{ r: 4, fill: omega.gold }}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </div>
    </motion.div>
  );
}
