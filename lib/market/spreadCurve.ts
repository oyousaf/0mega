type Market = "crypto" | "equity" | "forex";

/**
 * Base spread in pips (forex) or bps (others).
 * Conservative defaults.
 */
const BASE_SPREAD: Record<Market, number> = {
  forex: 1.2,   // pips
  equity: 2.0,  // bps
  crypto: 4.0,  // bps
};

/**
 * Volatility sensitivity.
 * Higher = spreads widen faster.
 */
const VOL_MULTIPLIER: Record<Market, number> = {
  forex: 3.0,
  equity: 2.0,
  crypto: 4.0,
};

/**
 * Compute dynamic spread factor from recent price movement.
 * Deterministic and candle-agnostic.
 */
export function computeSpreadFactor(params: {
  market: Market;
  midPrice: number;
  prevPrice?: number;
}) {
  if (!params.prevPrice) return 1;

  const movePct =
    Math.abs(params.midPrice - params.prevPrice) / params.prevPrice;

  return 1 + movePct * VOL_MULTIPLIER[params.market];
}

export function getBaseSpread(market: Market) {
  return BASE_SPREAD[market];
}
