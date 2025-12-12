import { Trade } from "@/app/types/trade";

export interface DashboardMetrics {
  winRate: number;
  expectancy: number;
  profitFactor: number;
  halaalRatio: number;
}

/* -------------------------------------------------------
   Compute metrics from executed trades only
------------------------------------------------------- */
export function computeMetricsFromTrades(trades: Trade[]): DashboardMetrics {
  if (!trades || trades.length === 0) {
    return {
      winRate: 0,
      expectancy: 0,
      profitFactor: 0,
      halaalRatio: 100,
    };
  }

  let wins = 0;
  let losses = 0;

  let totalWinR = 0;
  let totalLossR = 0;

  let halaalWins = 0;

  for (const t of trades) {
    const pl = Number(t.realised_pl);
    const entry = Number(t.entry_price);
    const qty = Number(t.qty);

    if (!isFinite(pl) || !isFinite(entry) || !isFinite(qty)) continue;
    if (entry <= 0 || qty <= 0) continue;

    const r = pl / (entry * qty);

    if (r > 0) {
      wins++;
      totalWinR += r;
      if (t.halaal) halaalWins++;
    }

    if (r < 0) {
      losses++;
      totalLossR += Math.abs(r);
    }
  }

  const total = wins + losses;

  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const expectancy = total
    ? Number(((wins / total) * 1 - (losses / total) * 1).toFixed(2))
    : 0;

  const profitFactor =
    totalLossR === 0 ? totalWinR : Number((totalWinR / totalLossR).toFixed(2));

  const halaalRatio =
    wins > 0 ? Math.round((halaalWins / wins) * 100) : 100;

  return {
    winRate,
    expectancy,
    profitFactor,
    halaalRatio,
  };
}
