import { Trade } from "@/app/types/trade";

export interface DashboardMetrics {
  winRate: number;
  expectancy: number;
  profitFactor: string;
  halaalRatio: number;
}

/* -------------------------------------------------------
   Compute metrics from CLOSED trades only
   - Uses realised PnL
   - Uses TRUE R multiple (PnL / risk_amount)
   - Breakevens excluded
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
    const risk = Number((t as any).risk_amount);

    if (!Number.isFinite(pl) || !Number.isFinite(risk)) continue;
    if (risk <= 0) continue;
    if (pl === 0) continue;

    /* -------- R MULTIPLE -------- */
    const r = pl / risk;

    if (r > 0) {
      wins++;
      totalWinR += r;
      if ((t as any).halaal !== false) halaalWins++;
      grossProfit += pl;
    } else {
      losses++;
      totalLossR += Math.abs(r);
      grossLoss += Math.abs(pl);
    }
  }

  const total = wins + losses;

  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  /* -------- EXPECTANCY -------- */
  const avgWinR = wins > 0 ? totalWinR / wins : 0;
  const avgLossR = losses > 0 ? totalLossR / losses : 0;

  const expectancy =
    total > 0
      ? Number(
          ((wins / total) * avgWinR - (losses / total) * avgLossR).toFixed(2)
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
