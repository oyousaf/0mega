export interface Signal {
  id: number;
  symbol: string;
  strategy: string;
  entry_price: number;
  tp1: number;
  tp2: number;
  sl: number;
  status: string;
  type?: string;
  halaal?: boolean;
  created_at: string;
  current_price?: number;
}

export interface DashboardMetrics {
  total: number;
  active: number;
  winRate: number;
  halaalRatio: number;
}

/* ---------------------------------------------
   Helper: Count Total Signals
---------------------------------------------- */
function getTotalSignals(signals: Signal[]): number {
  return signals.length;
}

/* ---------------------------------------------
   Helper: Count Active Signals
   (status does NOT include TP/SL, not closed)
---------------------------------------------- */
function getActiveSignals(signals: Signal[]): number {
  return signals.filter((s) => {
    const status = s.status.toLowerCase();
    return (
      !status.includes("tp") &&
      !status.includes("sl") &&
      !status.includes("closed")
    );
  }).length;
}

/* ---------------------------------------------
   Helper: Win Rate
   WIN = status contains "tp"
   LOSS = status contains "sl"
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
   Helper: Halaal Ratio
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
