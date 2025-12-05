"use client";

import { motion } from "framer-motion";
import { omegaAnalytics as omega } from "./theme";
import { Signal } from "@/app/types/signal";

interface Props {
  signals: Signal[];
}

export default function StrategyMiniCards({ signals }: Props) {
  if (!signals.length) return null;

  const total = signals.length;
  const wins = signals.filter((s) => s.tp1_hit || s.tp2_hit).length;
  const losses = signals.filter((s) => s.sl_hit).length;
  const winRate = total ? (wins / total) * 100 : 0;

  const avgRR = (() => {
    let sum = 0;
    let count = 0;

    for (const s of signals) {
      if (s.entry_price && s.sl && s.tp1) {
        const risk = Math.abs(s.entry_price - s.sl);
        const reward = Math.abs(s.tp1 - s.entry_price);
        if (risk > 0) {
          sum += reward / risk;
          count++;
        }
      }
    }
    return count ? sum / count : 0;
  })();

  const cards = [
    { label: "TOTAL TRADES", value: total },
    { label: "WIN RATE", value: winRate.toFixed(1) + "%" },
    { label: "WINS", value: wins },
    { label: "LOSSES", value: losses },
    { label: "AVG R:R", value: avgRR.toFixed(2) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.35 }}
          style={{
            background: omega.bg,
            border: omega.cardBorder,
            borderRadius: "0.75rem",
            padding: "1rem",
            textAlign: "center",
            boxShadow: omega.cardShadow,
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              opacity: 0.65,
              color: omega.text,
              marginBottom: "4px",
            }}
          >
            {c.label}
          </div>

          <div
            style={{
              fontSize: "1.3rem",
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
