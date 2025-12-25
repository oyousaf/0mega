import { pipsToPrice } from "@/lib/market/forex";
import { computeSpreadFactor, getBaseSpread } from "@/lib/market/spreadCurve";

type Side = "BUY" | "SELL";
type Market = "crypto" | "equity" | "forex";

export function applySpread(params: {
  market: Market;
  pair?: string;
  midPrice: number;
  side: Side;
  prevPrice?: number;
}) {
  const base = getBaseSpread(params.market);
  const factor = computeSpreadFactor({
    market: params.market,
    midPrice: params.midPrice,
    prevPrice: params.prevPrice,
  });

  let spreadAmount: number;

  if (params.market === "forex") {
    spreadAmount = pipsToPrice(params.pair!, (base * factor) / 2);
  } else {
    // bps → price
    spreadAmount = (params.midPrice * (base * factor)) / 10_000 / 2;
  }

  return params.side === "BUY"
    ? params.midPrice + spreadAmount
    : params.midPrice - spreadAmount;
}
