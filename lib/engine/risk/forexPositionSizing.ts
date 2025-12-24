import { getPipMeta } from "@/lib/market/forex";

export function computeForexPositionSize(params: {
  equity: number;
  riskPct: number; // e.g. 0.01 = 1%
  slPips: number;
  pair: string;
}) {
  const { equity, riskPct, slPips, pair } = params;

  if (riskPct <= 0 || riskPct > 0.05) {
    throw new Error("INVALID_RISK_PCT");
  }

  if (slPips <= 0) {
    throw new Error("INVALID_SL_PIPS");
  }

  const { pipValue } = getPipMeta(pair);

  const riskAmount = equity * riskPct;
  const qty = riskAmount / (slPips * pipValue);

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("INVALID_FOREX_POSITION_SIZE");
  }

  return qty;
}
