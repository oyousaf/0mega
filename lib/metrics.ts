import { Trade } from "@/app/types/trade";

export interface DashboardMetrics {
  winRate: number;
  expectancy: number;
  profitFactor: string;
  halaalRatio: number;
}

/* -------------------------------------------------------
   Compute metrics from executed trades only
------------------------------------------------------- */
export function computeMetricsFromTrades(
  trades: Trade[]
): DashboardMetrics {
  if (!trades || trades.length === 0) {
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
    const pl = Number(t.realised_pl);
    const entry = Number(t.entry_price);
    const qty = Number(t.qty);

    if (!isFinite(pl) || !isFinite(entry) || !isFinite(qty)) continue;
    if (entry <= 0 || qty <= 0) continue;

    /* -------- R MULTIPLE (Expectancy) -------- */
    const r = pl / (entry * qty);

    if (r > 0) {
      wins++;
      totalWinR += r;
      if (t.halaal) halaalWins++;
    } else if (r < 0) {
      losses++;
      totalLossR += Math.abs(r);
    }

    /* -------- CASH (Profit Factor) -------- */
    if (pl > 0) grossProfit += pl;
    else if (pl < 0) grossLoss += Math.abs(pl);
  }

  const total = wins + losses;

  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const expectancy =
    total > 0
      ? Number(((wins / total) * 1 - (losses / total) * 1).toFixed(2))
      : 0;

  /* -------- PROFIT FACTOR -------- */
  let profitFactor: string;

  if (grossLoss === 0) {
    profitFactor = grossProfit > 0 ? "∞" : "—";
  } else {
    profitFactor = (grossProfit / grossLoss).toFixed(2);
  }

  const halaalRatio =
    wins > 0 ? Math.round((halaalWins / wins) * 100) : 100;

  return {
    winRate,
    expectancy,
    profitFactor,
    halaalRatio,
  };
}
