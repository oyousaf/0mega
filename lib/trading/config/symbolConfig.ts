export type SymbolConfig = {
  pipSize: number;
  pipValuePerLot: number;
};

export const SYMBOL_CONFIG: Record<string, SymbolConfig> = {
  /* ---------------------------------
     FOREX
  ---------------------------------- */

  EURUSD: {
    pipSize: 0.0001,
    pipValuePerLot: 10,
  },

  GBPUSD: {
    pipSize: 0.0001,
    pipValuePerLot: 10,
  },

  USDJPY: {
    pipSize: 0.01,
    pipValuePerLot: 9.13,
  },

  /* ---------------------------------
     METALS
  ---------------------------------- */

  XAUUSD: {
    pipSize: 0.01,
    pipValuePerLot: 1,
  },

  /* ---------------------------------
     CRYPTO
  ---------------------------------- */

  BTCUSDT: {
    pipSize: 1,
    pipValuePerLot: 1,
  },

  ETHUSDT: {
    pipSize: 0.1,
    pipValuePerLot: 1,
  },
};
