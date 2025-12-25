type Market = "crypto" | "equity" | "forex";

type FeeConfig = {
  bps: number; // basis points per side
};

// Conservative defaults. Tune later.
const DEFAULT_FEES: Record<Market, FeeConfig> = {
  crypto: { bps: 10 }, // 0.10%
  equity: { bps: 5 }, // 0.05%
  forex: { bps: 2 }, // 0.02%
};

export function computeFee(params: {
  market: Market;
  price: number;
  qty: number;
}) {
  const cfg = DEFAULT_FEES[params.market];
  const notional = params.price * params.qty;
  return (notional * cfg.bps) / 10_000;
}
