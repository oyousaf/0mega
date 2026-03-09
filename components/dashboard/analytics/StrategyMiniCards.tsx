"use client";

import { motion } from "framer-motion";
import { omegaAnalytics as omega } from "./theme";
import { Trade } from "@/types/trade";
import { useMemo } from "react";

interface Props {
  trades: Trade[];
}

export default function StrategyMiniCards({ trades }: Props) {
  const stats = useMemo(() => {
    let total = 0;
    let wins = 0;
    let losses = 0;
    let rrSum = 0;
    let rrCount = 0;

    for (const t of trades) {
      const pl = Number(t.realised_pl);

      if (!t.is_closed || !Number.isFinite(pl) || pl === 0) {
        continue;
      }

      total++;

      if (pl > 0) wins++;
      else losses++;

      const rr = Number(t.rr);
      if (Number.isFinite(rr)) {
        rrSum += rr;
        rrCount++;
      }
    }

    return {
      total,
      wins,
      losses,
      winRate: total ? (wins / total) * 100 : 0,
      avgRR: rrCount ? rrSum / rrCount : 0,
    };
  }, [trades]);

  if (!stats.total) return null;

  const cards = [
    { label: "TRADES", value: stats.total },
    { label: "WIN RATE", value: stats.winRate.toFixed(1) + "%" },
    { label: "WINS", value: stats.wins },
    { label: "LOSSES", value: stats.losses },
    { label: "AVG R:R", value: stats.avgRR.toFixed(2) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          style={{
            background: omega.bg,
            border: omega.cardBorder,
            borderRadius: "0.6rem",
            padding: "0.75rem",
            textAlign: "center",
            boxShadow: omega.cardShadow,
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              opacity: 0.65,
              color: omega.text,
              marginBottom: "3px",
            }}
          >
            {c.label}
          </div>

          <div
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              color: omega.text,
              textShadow: omega.glow,
            }}
          >
            {c.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
