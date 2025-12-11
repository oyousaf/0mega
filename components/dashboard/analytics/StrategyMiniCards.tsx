"use client";

import { motion } from "framer-motion";
import { omegaAnalytics as omega } from "./theme";

// Trades come from trade history API
interface Props {
  trades: any[];
}

export default function StrategyMiniCards({ trades }: Props) {
  if (!trades.length) return null;

  // Closed trades only
  const closed = trades.filter((t) => t.realised_pl !== null);

  const total = closed.length;
  const wins = closed.filter((t) => Number(t.realised_pl) > 0).length;
  const losses = closed.filter((t) => Number(t.realised_pl) < 0).length;

  const winRate = total ? (wins / total) * 100 : 0;

  // Compute average R:R using actual fill prices
  const avgRR = (() => {
    let sum = 0;
    let count = 0;

    for (const t of closed) {
      if (!t.entry_price || !t.close_price) continue;

      const entry = Number(t.entry_price);
      const close = Number(t.close_price);

      // Reward calculation based on direction
      const reward =
        t.trade_side === "LONG"
          ? Math.abs(close - entry)
          : Math.abs(entry - close);

      // Risk (fallback uses entry if SL missing)
      const risk = Math.abs(entry - (t.sl ?? entry));

      if (risk > 0) {
        sum += reward / risk;
        count++;
      }
    }

    return count ? sum / count : 0;
  })();

  const cards = [
    { label: "TRADES", value: total },
    { label: "WIN RATE", value: winRate.toFixed(1) + "%" },
    { label: "WINS", value: wins },
    { label: "LOSSES", value: losses },
    { label: "AVG R:R", value: avgRR.toFixed(2) },
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
