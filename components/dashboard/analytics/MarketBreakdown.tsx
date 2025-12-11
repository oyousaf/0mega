"use client";

import { Trade } from "@/app/types/trade";
import { omegaAnalytics as omega } from "./theme";
import { motion } from "framer-motion";
import { Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ---------------------------------------------------------
   MARKET CLASSIFICATION
--------------------------------------------------------- */

function getMarket(symbol: string): "crypto" | "forex" | "stock" | "other" {
  if (!symbol) return "other";

  const s = symbol.toUpperCase();

  // Crypto pattern (BTCUSDT, ETHUSD, SOLUSDT)
  if (s.endsWith("USDT") || s.endsWith("USD") || /^[A-Z]{3,5}BTC$/.test(s)) {
    if (["XAUUSD", "XAGUSD"].includes(s)) return "forex"; // avoid gold misclassifying as crypto
    return "crypto";
  }

  // Forex pattern (GBPUSD, EURUSD, USDJPY, etc.)
  if (/^[A-Z]{6}$/.test(s)) return "forex";

  // Stocks (AAPL, TSLA, NVDA, etc.)
  if (/^[A-Z]{1,5}$/.test(s)) return "stock";

  return "other";
}

/* ---------------------------------------------------------
   BREAKDOWN CALCULATION USING REAL TRADE DATA
--------------------------------------------------------- */

function computeMarketBreakdown(trades: Trade[]) {
  const markets = ["crypto", "forex", "stock"] as const;

  const buckets = {
    crypto: [] as Trade[],
    forex: [] as Trade[],
    stock: [] as Trade[],
  };

  for (const t of trades) {
    const m = getMarket(t.symbol);
    if (m in buckets) {
      buckets[m as keyof typeof buckets].push(t);
    }
  }

  return markets.map((m) => {
    const rows = buckets[m];

    const total = rows.length;

    const wins = rows.filter((t) => Number(t.realised_pl ?? 0) > 0).length;

    return {
      market: m.toUpperCase(),
      total,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    };
  });
}

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */

export default function MarketBreakdown({ trades }: { trades: Trade[] }) {
  const data = computeMarketBreakdown(trades);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ width: "100%", height: "100%" }}
    >
      <Box
        sx={{
          background: omega.bg,
          border: omega.cardBorder,
          boxShadow: omega.cardShadow,
          borderRadius: "1rem",
          padding: "1.5rem",
          color: omega.text,
          width: "100%",
          height: "100%",
        }}
      >
        <h2 className="text-xl font-semibold text-omega-gold mb-3">
          📈 Market Breakdown
        </h2>

        <div style={{ width: "100%", height: 150 }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 320, height: 200 }}
          >
            <BarChart data={data} barSize={32}>
              <XAxis
                dataKey="market"
                tick={{ fill: omega.text }}
                axisLine={{ stroke: omega.sep }}
                tickLine={{ stroke: omega.sep }}
              />

              <YAxis
                tick={{ fill: omega.text }}
                axisLine={{ stroke: omega.sep }}
                tickLine={{ stroke: omega.sep }}
                allowDecimals={false}
              />

              <Tooltip
                contentStyle={{
                  background: omega.bg,
                  border: `1px solid ${omega.sep}`,
                  borderRadius: "0.5rem",
                  color: omega.text,
                }}
              />

              <Bar dataKey="winRate">
                {data.map((d) => {
                  const colour =
                    d.winRate >= 60
                      ? "#4CAF50" // strong
                      : d.winRate >= 40
                      ? "#FFC107" // average
                      : "#FF5252"; // poor
                  return <Cell key={d.market} fill={colour} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-6 mt-4 text-sm opacity-80">
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
