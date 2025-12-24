type SpreadMap = Record<string, number>;

export const FOREX_SPREAD_PIPS: SpreadMap = {
  "EUR/USD": 1.0,
  "GBP/USD": 1.5,
  "USD/JPY": 1.2,
  "EUR/JPY": 1.6,
};

export function normalisePair(pair: string) {
  return pair.includes("/")
    ? pair
    : `${pair.slice(0, 3)}/${pair.slice(3)}`;
}

export function getForexSpreadPips(pair: string): number {
  const p = normalisePair(pair);
  return FOREX_SPREAD_PIPS[p] ?? 1.5;
}
