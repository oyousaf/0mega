import { Signal } from "@/app/types/signal";

/* -------------------------------------------------------
   Types
------------------------------------------------------- */
export interface DashboardMetrics {
  total: number;
  active: number;

  // Outcome counts
  tp1: number;
  tp2: number;
  sl: number;
  expired: number;

  // Ratios
  winRate: number;
  lossRate: number;
  halaalRatio: number;

  // Profitability
  expectancy: number;
  profitFactor: number;

  // Breakdown
  bySymbol: Record<string, SymbolStats>;
  bySession: SessionBreakdown;

  // Best/Worst
  bestSymbol: string | null;
  worstSymbol: string | null;
}

export interface SymbolStats {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  expectancy: number;
}

export interface SessionBreakdown {
  london: number;
  ny: number;
  asian: number;
}

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

// Determine session by hour
function sessionFromDate(date: Date): keyof SessionBreakdown {
  const h = date.getUTCHours();
  if (h >= 7 && h < 15) return "london";          // 07:00–15:00 UTC
  if (h >= 12 && h < 21) return "ny";             // 12:00–21:00 UTC
  return "asian";                                 // catch-all
}

// Determine win/loss from status
function isWin(status: string): boolean {
  return status.toLowerCase().includes("tp");
}

function isLoss(status: string): boolean {
  return status.toLowerCase().includes("sl");
}

/* -------------------------------------------------------
   Main Metrics Computation
------------------------------------------------------- */
export function computeMetrics(signals: Signal[]): DashboardMetrics {
  if (!signals || signals.length === 0) {
    return {
      total: 0,
      active: 0,
      tp1: 0,
      tp2: 0,
      sl: 0,
      expired: 0,
      winRate: 0,
      lossRate: 0,
      halaalRatio: 0,
      expectancy: 0,
      profitFactor: 0,
      bySymbol: {},
      bySession: { london: 0, ny: 0, asian: 0 },
      bestSymbol: null,
      worstSymbol: null,
    };
  }

  const total = signals.length;

  let active = 0;
  let tp1 = 0;
  let tp2 = 0;
  let sl = 0;
  let expired = 0;

  let wins = 0;
  let losses = 0;

  let halaalCount = 0;

  const bySymbol: Record<string, SymbolStats> = {};
  const bySession: SessionBreakdown = { london: 0, ny: 0, asian: 0 };

  for (const s of signals) {
    const status = s.status.toLowerCase();

    // Active count
    if (status === "active") active++;

    // Outcome buckets
    if (status.includes("tp1")) tp1++;
    if (status.includes("tp2")) tp2++;
    if (status.includes("sl")) sl++;
    if (status.includes("exp")) expired++;

    // Win/loss classification
    if (isWin(status)) wins++;
    if (isLoss(status)) losses++;

    // Halaal ratio
    if (s.halaal) halaalCount++;

    // Symbol performance table
    const sym = s.symbol;
    if (!bySymbol[sym]) {
      bySymbol[sym] = { wins: 0, losses: 0, total: 0, winRate: 0, expectancy: 0 };
    }

    bySymbol[sym].total++;
    if (isWin(status)) bySymbol[sym].wins++;
    if (isLoss(status)) bySymbol[sym].losses++;

    // Session breakdown
    const session = sessionFromDate(new Date(s.created_at));
    bySession[session]++;
  }

  /* -------------------------------
     Ratios
  -------------------------------- */
  const winRate = Math.round((wins / total) * 100);
  const lossRate = Math.round((losses / total) * 100);
  const halaalRatio = Math.round((halaalCount / total) * 100);

  /* -------------------------------
     Expectancy (in R-multiple terms)
     E = (Win% * AvgWinR) - (Loss% * AvgLossR)
     For now assume:
       Win R = +1  
       Loss R = -1 
     (We refine later in automation)
  -------------------------------- */
  const pWin = wins / total;
  const pLoss = losses / total;

  const expectancy = +(pWin * 1 - pLoss * 1).toFixed(2);

  /* -------------------------------
     Profit Factor
     PF = TotalWin / TotalLoss (in R)
     Using TP2 ≈ +2R, TP1 ≈ +1R, SL ≈ -1R
  -------------------------------- */
  const totalWinR = tp1 * 1 + tp2 * 2;
  const totalLossR = sl * 1;

  const profitFactor =
    totalLossR === 0 ? totalWinR : +(totalWinR / totalLossR).toFixed(2);

  /* -------------------------------
     Symbol-level metrics
  -------------------------------- */
  let bestSymbol: string | null = null;
  let worstSymbol: string | null = null;

  let bestScore = -Infinity;
  let worstScore = Infinity;

  for (const sym in bySymbol) {
    const s = bySymbol[sym];
    s.winRate = Math.round((s.wins / s.total) * 100);
    s.expectancy = +(s.winRate / 100 - (1 - s.winRate / 100)).toFixed(2);

    if (s.expectancy > bestScore) {
      bestScore = s.expectancy;
      bestSymbol = sym;
    }
    if (s.expectancy < worstScore) {
      worstScore = s.expectancy;
      worstSymbol = sym;
    }
  }

  /* -------------------------------
     Final return
  -------------------------------- */
  return {
    total,
    active,
    tp1,
    tp2,
    sl,
    expired,
    winRate,
    lossRate,
    halaalRatio,
    expectancy,
    profitFactor,
    bySymbol,
    bySession,
    bestSymbol,
    worstSymbol,
  };
}
