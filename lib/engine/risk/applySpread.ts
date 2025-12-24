import { pipsToPrice } from "@/lib/market/forex";
import { getForexSpreadPips } from "@/lib/market/spread";

type Side = "BUY" | "SELL";

export function applyForexSpread(params: {
  pair: string;
  midPrice: number;
  side: Side;
}) {
  const spreadPips = getForexSpreadPips(params.pair);
  const halfSpread = pipsToPrice(params.pair, spreadPips / 2);

  return params.side === "BUY"
    ? params.midPrice + halfSpread
    : params.midPrice - halfSpread;
}
