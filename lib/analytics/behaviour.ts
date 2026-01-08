import { Trade } from "@/app/types/trade";

export function analyseBehaviour(trades: Trade[]) {
  const closed = trades
    .filter(
      (t) =>
        t.is_closed &&
        t.closed_at !== null &&
        Number.isFinite(Number(t.realised_pl))
    )
    .sort(
      (a, b) =>
        new Date(a.closed_at!).getTime() - new Date(b.closed_at!).getTime()
    );

  let maxLossStreak = 0;
  let current = 0;

  for (const t of closed) {
    const pl = Number(t.realised_pl);

    if (pl < 0) {
      current++;
      if (current > maxLossStreak) maxLossStreak = current;
    } else {
      current = 0;
    }
  }

  const uniqueDays = new Set(closed.map((t) => t.closed_at!.slice(0, 10))).size;

  return {
    trades: closed.length,
    maxLossStreak,
    avgTradesPerDay: uniqueDays === 0 ? 0 : closed.length / uniqueDays,
  };
}
