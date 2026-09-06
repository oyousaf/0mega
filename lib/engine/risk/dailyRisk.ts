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
    state[market] = { day, realisedPnl: 0, frozen: false };
  }
  return state[market];
}
