type DailyRiskState = {
  day: string;
  realisedPnl: number;
  frozen: boolean;
};

const state: Record<string, DailyRiskState> = {};

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyRisk(market: string): DailyRiskState {
  const day = todayUTC();

  if (!state[market] || state[market].day !== day) {
    state[market] = {
      day,
      realisedPnl: 0,
      frozen: false,
    };
  }

  return state[market];
}

export function recordRealisedPnl(
  market: string,
  pnl: number,
  maxDailyLoss: number
) {
  const r = getDailyRisk(market);
  r.realisedPnl += pnl;

  if (r.realisedPnl <= -Math.abs(maxDailyLoss)) {
    r.frozen = true;
  }
}

export function assertTradingAllowed(
  market: string,
  maxDailyLoss: number
) {
  const r = getDailyRisk(market);

  if (r.frozen) {
    throw new Error(
      `DAILY_LOSS_LIMIT_REACHED:${market}:${r.realisedPnl}`
    );
  }

  return true;
}
