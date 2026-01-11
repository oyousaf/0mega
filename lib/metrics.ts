import { Trade } from "@/app/types/trade";

export interface DashboardMetrics {
  winRate: number;
  expectancy: number;
  profitFactor: string;
  halaalRatio: number;
}

/* -------------------------------------------------------
   Compute metrics from CLOSED trades only
   - Uses realised PnL for win/loss
   - Uses stored RR as R multiple
   - Breakevens excluded from expectancy
------------------------------------------------------- */
export function computeMetricsFromTrades(trades: Trade[]): DashboardMetrics {
  if (!Array.isArray(trades) || trades.length === 0) {
    return {
      winRate: 0,
      expectancy: 0,
      profitFactor: "—",
      halaalRatio: 100,
    };
  }

  let wins = 0;
  let losses = 0;

  let totalWinR = 0;
  let totalLossR = 0;

  let grossProfit = 0;
  let grossLoss = 0;

  let halaalWins = 0;

  for (const t of trades) {
    if (!t.is_closed) continue;

    const pl = Number(t.realised_pl);
    if (!Number.isFinite(pl) || pl === 0) continue;

    const rr = Number(t.rr);
    if (!Number.isFinite(rr) || rr <= 0) continue;

    if (pl > 0) {
      wins++;
      totalWinR += rr;
      grossProfit += pl;
      if ((t as any).halaal !== false) halaalWins++;
    } else {
      losses++;
      totalLossR += rr;
      grossLoss += Math.abs(pl);
    }
  }

  const total = wins + losses;

  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  /* -------- EXPECTANCY (R) -------- */
  const avgWinR = wins > 0 ? totalWinR / wins : 0;
  const avgLossR = losses > 0 ? totalLossR / losses : 0;

  const expectancy =
    total > 0
      ? Number(
          ((wins / total) * avgWinR -
            (losses / total) * avgLossR).toFixed(2)
        )
      : 0;

  /* -------- PROFIT FACTOR -------- */
  const profitFactor =
    grossLoss === 0
      ? grossProfit > 0
        ? "∞"
        : "—"
      : (grossProfit / grossLoss).toFixed(2);

  /* -------- HALAAL RATIO -------- */
  const halaalRatio = wins > 0 ? Math.round((halaalWins / wins) * 100) : 100;

  return {
    winRate,
    expectancy,
    profitFactor,
    halaalRatio,
  };
}
