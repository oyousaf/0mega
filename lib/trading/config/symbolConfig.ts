export type TradeSymbol = "EURUSD" | "GBPUSD" | "XAUUSD";

type Timeframe = "1m" | "5m" | "15m";

export type SymbolConfig = {
  symbol: TradeSymbol;
  timeframe: Timeframe;

  pipSize: number;
  pipValuePerLot: number;

  rrTarget: number;

  emaPeriod: number;

  maxSpreadPips: number;
  baseSpreadPips: number;

  volWindow: number;
  minVolPct: number;

  regimeWindow: number;
  regimeMinPct: number;

  rangeWindow: number;
  minRangePct: number;

  activationWindow: number;
  minActivationRangePips: number;

  newsLookback: number;
  newsSpikePips: number;

  sessionTimeZone: string;
  sessionStartHour: number;
  sessionEndHour: number;
};

export const SYMBOL_CONFIG: Record<TradeSymbol, SymbolConfig> = {
  EURUSD: {
    symbol: "EURUSD",
    timeframe: "1m",

    pipSize: 0.0001,
    pipValuePerLot: 10,

    rrTarget: 1.25,

    emaPeriod: 200,

    maxSpreadPips: 1.5,
    baseSpreadPips: 0.8,

    volWindow: 20,
    minVolPct: 0.00005,

    regimeWindow: 100,
    regimeMinPct: 0.00006,

    rangeWindow: 15,
    minRangePct: 0.00025,

    activationWindow: 30,
    minActivationRangePips: 3,

    newsLookback: 5,
    newsSpikePips: 18,

    sessionTimeZone: "Europe/London",
    sessionStartHour: 7,
    sessionEndHour: 17,
  },

  GBPUSD: {
    symbol: "GBPUSD",
    timeframe: "1m",

    pipSize: 0.0001,
    pipValuePerLot: 10,

    rrTarget: 1.25,

    emaPeriod: 200,

    maxSpreadPips: 2.0,
    baseSpreadPips: 1.0,

    volWindow: 20,
    minVolPct: 0.00006,

    regimeWindow: 100,
    regimeMinPct: 0.00007,

    rangeWindow: 15,
    minRangePct: 0.0003,

    activationWindow: 30,
    minActivationRangePips: 4,

    newsLookback: 5,
    newsSpikePips: 22,

    sessionTimeZone: "Europe/London",
    sessionStartHour: 7,
    sessionEndHour: 17,
  },

  XAUUSD: {
    symbol: "XAUUSD",
    timeframe: "1m",

    pipSize: 0.01,
    pipValuePerLot: 1,

    rrTarget: 1.25,

    emaPeriod: 200,

    maxSpreadPips: 35,
    baseSpreadPips: 20,

    volWindow: 20,
    minVolPct: 0.00008,

    regimeWindow: 120,
    regimeMinPct: 0.00009,

    rangeWindow: 20,
    minRangePct: 0.00045,

    activationWindow: 40,
    minActivationRangePips: 80,

    newsLookback: 5,
    newsSpikePips: 250,

    sessionTimeZone: "America/New_York",
    sessionStartHour: 8,
    sessionEndHour: 17,
  },
};

export const ACTIVE_SYMBOLS: TradeSymbol[] = ["EURUSD"];

export function getSymbolConfig(symbol: string): SymbolConfig | null {
  return SYMBOL_CONFIG[symbol as TradeSymbol] ?? null;
}
