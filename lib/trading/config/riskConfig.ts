export const RISK_CONFIG = {
  initialEquity: 10_000,
  riskPerTrade: 0.005,
  maxDailyLossPct: 0.03,
  maxTradesPerDay: 25,
  maxConsecutiveLosses: 3,
  cooldownMinutes: 10,
} as const;
