"use client";

import { Trade } from "@/types/trade";
import { analyseBehaviour } from "@/lib/analytics/behaviour";

export default function ForwardTestReview({ trades }: { trades: Trade[] }) {
  const stats = analyseBehaviour(trades);

  return (
    <div
      className="rounded-xl border border-omega-dark-gold
      bg-omega-green p-4 space-y-3"
    >
      <h3
        className="text-lg font-semibold text-omega-gold
        text-center"
      >
        📋 Forward-Test Review
      </h3>

      <div
        className="grid grid-cols-3 gap-4
        text-center text-omega-gold"
      >
        <div>
          <p className="text-xs opacity-70">TRADES</p>
          <p className="font-bold">{stats.trades}</p>
        </div>

        <div>
          <p className="text-xs opacity-70">MAX LOSS STREAK</p>
          <p className="font-bold">{stats.maxLossStreak}</p>
        </div>

        <div>
          <p className="text-xs opacity-70">AVG TRADES / DAY</p>
          <p className="font-bold">{stats.avgTradesPerDay.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
