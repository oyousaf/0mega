"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
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

function fmtShortDate(iso: string, compact: boolean) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(
    "en-GB",
    compact
      ? { day: "2-digit", month: "2-digit" }
      : { day: "2-digit", month: "short" }
  );
}

function fmtMoney(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: 0 });
}

export default function PerformanceChart({ data }: Props) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  const compact = size.width > 0 && size.width < 520;

  const formatted = useMemo(
    () =>
      data.map((d) => ({
        date: fmtShortDate(d.date, compact),
        cumulative: Number(d.cumulative) || 0,
      })),
    [data, compact]
  );

  const tickCount = compact ? 3 : 6;
  const yWidth = compact ? 40 : 56;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="w-full h-full"
      style={{
        background: omega.green,
        border: "1px solid var(--omega-dark-gold)",
        borderRadius: "0.75rem",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="px-4 pt-3 pb-1 text-center">
        <h2 className="text-xl font-semibold text-omega-gold">
          📈 Equity Curve
        </h2>
      </div>

      <div ref={ref} style={{ flex: 1, padding: "0 1rem 1rem" }}>
        {size.width > 0 && size.height > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
                wrapperStyle={{ outline: "none" }}
                contentStyle={{
                  background: omega.green,
                  border: "1px solid var(--omega-dark-gold)",
                  color: omega.gold,
                  fontSize: 12,
                }}
                labelStyle={{ color: omega.gold, opacity: 0.8 }}
                formatter={(value: any) => [`£${fmtMoney(value)}`, "Equity"]}
              />

              <Line
                type="monotone"
                dataKey="cumulative"
                stroke={omega.gold}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
