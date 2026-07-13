export type TradeSymbol = "EURUSD" | "GBPUSD" | "XAUUSD";

export type Timeframe = "1m" | "5m" | "15m";

export type SymbolConfig = {
  symbol: TradeSymbol;
  timeframe: Timeframe;

  pipSize: number;
  pipValuePerLot: number;

  rrTarget: number;

  emaPeriod: number;

  maxSpreadPips: number;

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

  sessionStartUtc: number;
  sessionEndUtc: number;
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

    sessionStartUtc: 6,
    sessionEndUtc: 21,
  },

  GBPUSD: {
    symbol: "GBPUSD",
    timeframe: "1m",

    pipSize: 0.0001,
    pipValuePerLot: 10,

    rrTarget: 1.25,

    emaPeriod: 200,

    maxSpreadPips: 2.0,

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

    sessionStartUtc: 6,
    sessionEndUtc: 21,
  },

  XAUUSD: {
    symbol: "XAUUSD",
    timeframe: "1m",

    pipSize: 0.01,
    pipValuePerLot: 1,

    rrTarget: 1.25,

    emaPeriod: 200,

    maxSpreadPips: 35,

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

    sessionStartUtc: 6,
    sessionEndUtc: 21,
  },
};

export const ACTIVE_SYMBOLS: TradeSymbol[] = ["EURUSD"];

export function getSymbolConfig(symbol: string): SymbolConfig | null {
  return SYMBOL_CONFIG[symbol as TradeSymbol] ?? null;
}
