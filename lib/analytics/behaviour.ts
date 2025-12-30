import { Trade } from "@/app/types/trade";
import { isClosedExecuted } from "@/lib/tradeGuards";

export function analyseBehaviour(trades: Trade[]) {
  const closed = trades.filter(isClosedExecuted);

  let maxLossStreak = 0;
  let current = 0;

  for (const t of closed) {
    const pl = Number(t.realised_pl) || 0;
    if (pl < 0) {
      current++;
      maxLossStreak = Math.max(maxLossStreak, current);
    } else {
      current = 0;
    }
  }

  return {
    trades: closed.length,
    maxLossStreak,
    avgTradesPerDay:
      closed.length === 0
        ? 0
        : closed.length /
          new Set(closed.map((t) => new Date(t.closed_at!).toDateString()))
            .size,
  };
}
