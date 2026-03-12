import { Trade } from "@/types/trade";

export interface DashboardMetrics {
  winRate: number;
  expectancy: number;
  profitFactor: string;
  halaalRatio: number;
}

/* -------------------------------------------------------
   Compute metrics from CLOSED trades
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

  let totalR = 0;

  let grossProfit = 0;
  let grossLoss = 0;

  let halaalTrades = 0;
  let countedTrades = 0;

  for (const t of trades) {
    if (!t?.is_closed) continue;

    const pl = Number((t as any).realised_pl);
    if (!Number.isFinite(pl)) continue;

    const risk = Number((t as any).risk_amount);
    if (!Number.isFinite(risk) || risk <= 0) continue;

    countedTrades++;

    if ((t as any).halaal !== false) halaalTrades++;

    /* -------- R MULTIPLE -------- */

    const rMultiple = pl / risk;
    totalR += rMultiple;

    /* -------- WIN / LOSS -------- */

    if (pl > 0) {
      wins++;
      grossProfit += pl;
    } else if (pl < 0) {
      losses++;
      grossLoss += Math.abs(pl);
    }
  }

  const total = wins + losses;

  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  /* -------- EXPECTANCY (R) -------- */

  const expectancy = total > 0 ? Number((totalR / total).toFixed(2)) : 0;

  /* -------- PROFIT FACTOR -------- */

  const profitFactor =
    grossLoss === 0
      ? grossProfit > 0
        ? "∞"
        : "—"
      : (grossProfit / grossLoss).toFixed(2);

  /* -------- HALAAL RATIO -------- */

  const halaalRatio =
    countedTrades > 0 ? Math.round((halaalTrades / countedTrades) * 100) : 100;

  return {
    winRate,
    expectancy,
    profitFactor,
    halaalRatio,
  };
}
