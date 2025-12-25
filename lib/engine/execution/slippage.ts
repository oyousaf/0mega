type Side = "BUY" | "SELL";
type Market = "crypto" | "equity" | "forex";

type SlippageConfig = {
  bps: number; // basis points
};

// Conservative defaults. Tune later.
const DEFAULT_SLIPPAGE: Record<Market, SlippageConfig> = {
  crypto: { bps: 5 },   // 0.05%
  equity: { bps: 2 },   // 0.02%
  forex:  { bps: 1 },   // 0.01%
};

export function applySlippage(params: {
  market: Market;
  midPrice: number;
  side: Side;
  // optional deterministic seed later
}) {
  const cfg = DEFAULT_SLIPPAGE[params.market];
  const slip = (params.midPrice * cfg.bps) / 10_000;

  // BUY pays more, SELL receives less
  return params.side === "BUY"
    ? params.midPrice + slip
    : params.midPrice - slip;
}
