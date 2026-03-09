"use client";

import { Trade } from "@/types/trade";
import { omegaAnalytics as omega } from "./theme";
import { motion } from "framer-motion";
import { Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { useElementSize } from "@/hooks/useElementSize";

/* ---------------------------------------------------------
   MARKET CLASSIFICATION
--------------------------------------------------------- */

function getMarket(symbol: string): "crypto" | "forex" | "stock" | "other" {
  if (!symbol) return "other";

  const s = symbol.toUpperCase();

  /* ---------- FOREX ---------- */
  // Standard FX pairs (EURUSD, GBPJPY etc)
  if (/^[A-Z]{6}$/.test(s)) return "forex";

  // Metals often traded as FX
  if (["XAUUSD", "XAGUSD"].includes(s)) return "forex";

  /* ---------- CRYPTO ---------- */
  if (s.endsWith("USDT")) return "crypto";
  if (/BTC$/.test(s)) return "crypto";

  /* ---------- STOCK ---------- */
  if (/^[A-Z]{1,5}$/.test(s)) return "stock";

  return "other";
}

/* ---------------------------------------------------------
   STRICT BREAKDOWN
--------------------------------------------------------- */

function hasExecutedAndClosed(t: Trade): boolean {
  const pl = Number(t.realised_pl);

  return (
    t.is_closed === true &&
    typeof t.closed_at === "string" &&
    Number.isFinite(pl)
  );
}

function computeMarketBreakdown(trades: Trade[]) {
  const markets = ["crypto", "forex", "stock"] as const;

  const buckets: Record<(typeof markets)[number], Trade[]> = {
    crypto: [],
    forex: [],
    stock: [],
  };

  for (const t of trades.filter(hasExecutedAndClosed)) {
    const m = getMarket(t.symbol);
    if (m in buckets) buckets[m as keyof typeof buckets].push(t);
  }

  return markets.map((m) => {
    const rows = buckets[m];
    const total = rows.length;
    const wins = rows.filter((t) => Number(t.realised_pl ?? 0) > 0).length;

    return {
      market: m.toUpperCase(),
      total,
      winRate: total ? Math.round((wins / total) * 100) : 0,
    };
  });
}

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */

export default function MarketBreakdown({ trades }: { trades: Trade[] }) {
  const data = computeMarketBreakdown(trades);
  const { ref, size } = useElementSize<HTMLDivElement>();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ width: "100%" }}
    >
      <Box
        sx={{
          background: omega.bg,
          border: omega.cardBorder,
          boxShadow: omega.cardShadow,
          borderRadius: "1rem",
          padding: "1rem",
          width: "100%",
        }}
      >
        <h2 className="text-xl font-semibold text-omega-gold mb-3 text-center">
          📊 Market Breakdown
        </h2>

        <div ref={ref} style={{ height: 160 }}>
          {size.width > 0 && size.height > 0 && (
            <BarChart
              width={size.width}
              height={size.height}
              data={data}
              barSize={32}
            >
              <CartesianGrid
                stroke={omega.sep}
                vertical={false}
                opacity={0.4}
              />

              <XAxis
                dataKey="market"
                tick={{ fill: omega.text, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{ fill: omega.text, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />

              <Tooltip
                contentStyle={{
                  background: omega.bg,
                  border: `1px solid ${omega.sep}`,
                  borderRadius: "0.5rem",
                  color: omega.text,
                  fontSize: 12,
                }}
              />

              <Bar dataKey="winRate">
                {data.map((d) => {
                  const colour =
                    d.winRate >= 60
                      ? "#4CAF50"
                      : d.winRate >= 40
                        ? "#FFC107"
                        : "#FF5252";
                  return <Cell key={d.market} fill={colour} />;
                })}
              </Bar>
            </BarChart>
          )}
        </div>

        <div className="flex justify-center gap-6 mt-4 text-sm text-omega-gold opacity-80">
          {data.map((d) => (
            <div key={d.market} className="text-center">
              <p className="font-semibold">{d.market}</p>
              <p>{d.total} trades</p>
              <p>{d.winRate}% win rate</p>
            </div>
          ))}
        </div>
      </Box>
    </motion.div>
  );
}
