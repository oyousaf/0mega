import { Signal } from "@/app/types/signal";

export interface DashboardMetrics {
  total: number;
  active: number;
  winRate: number;
  halaalRatio: number;
}

/* ---------------------------------------------
   Total Signals
---------------------------------------------- */
function getTotalSignals(signals: Signal[]): number {
  return signals.length;
}

/* ---------------------------------------------
   Active Signals
   ACTIVE = status === "ACTIVE"
---------------------------------------------- */
function getActiveSignals(signals: Signal[]): number {
  return signals.filter((s) => s.status === "ACTIVE").length;
}

/* ---------------------------------------------
   Win Rate
   WIN = status includes TP
   LOSS = status includes SL
---------------------------------------------- */
function getWinRate(signals: Signal[]): number {
  const total = signals.length;
  if (total === 0) return 0;

  const wins = signals.filter((s) =>
    s.status.toLowerCase().includes("tp")
  ).length;

  return Math.round((wins / total) * 100);
}

/* ---------------------------------------------
   Halaal Ratio
---------------------------------------------- */
function getHalaalRatio(signals: Signal[]): number {
  const total = signals.length;
  if (total === 0) return 0;

  const halaalCount = signals.filter((s) => s.halaal === true).length;

  return Math.round((halaalCount / total) * 100);
}

/* ---------------------------------------------
   Main Export
---------------------------------------------- */
export function computeMetrics(signals: Signal[]): DashboardMetrics {
  if (!signals || signals.length === 0) {
    return {
      total: 0,
      active: 0,
      winRate: 0,
      halaalRatio: 0,
    };
  }

  return {
    total: getTotalSignals(signals),
    active: getActiveSignals(signals),
    winRate: getWinRate(signals),
    halaalRatio: getHalaalRatio(signals),
  };
}
