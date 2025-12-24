import { pipsToPrice, priceToPips } from "@/lib/market/forex";

type Side = "BUY" | "SELL";

export function computeStopLossPrice(params: {
  pair: string;
  entryPrice: number;
  slPips: number;
  side: Side;
}) {
  const { pair, entryPrice, slPips, side } = params;

  if (slPips <= 0) {
    throw new Error("INVALID_SL_PIPS");
  }

  const delta = pipsToPrice(pair, slPips);

  return side === "BUY" ? entryPrice - delta : entryPrice + delta;
}

export function computeTakeProfitPrice(params: {
  pair: string;
  entryPrice: number;
  tpPips: number;
  side: Side;
}) {
  const { pair, entryPrice, tpPips, side } = params;

  if (tpPips <= 0) {
    throw new Error("INVALID_TP_PIPS");
  }

  const delta = pipsToPrice(pair, tpPips);

  return side === "BUY" ? entryPrice + delta : entryPrice - delta;
}

/**
 * Sanity validation. Prevent inverted stops.
 */
export function validateForexLevels(params: {
  entry: number;
  sl: number;
  tp?: number;
  side: Side;
}) {
  const { entry, sl, tp, side } = params;

  if (side === "BUY") {
    if (sl >= entry) throw new Error("BUY_SL_ABOVE_ENTRY");
    if (tp != null && tp <= entry) throw new Error("BUY_TP_BELOW_ENTRY");
  } else {
    if (sl <= entry) throw new Error("SELL_SL_BELOW_ENTRY");
    if (tp != null && tp >= entry) throw new Error("SELL_TP_ABOVE_ENTRY");
  }

  return true;
}
