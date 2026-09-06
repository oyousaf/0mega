import type { Candle } from "@/types/trade";
import type { SymbolConfig } from "@/lib/trading/config/symbolConfig";

export type SpreadEstimate = {
  pips: number;
  source: "quote" | "model";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function estimateSpread(
  candle: Candle,
  recentCandles: Candle[],
  config: SymbolConfig,
  at = new Date(),
): SpreadEstimate {
  if (
    Number.isFinite(candle.bid) &&
    Number.isFinite(candle.ask) &&
    Number(candle.ask) > Number(candle.bid)
  ) {
    return {
      pips: (Number(candle.ask) - Number(candle.bid)) / config.pipSize,
      source: "quote",
    };
  }

  const ranges = recentCandles
    .slice(-20)
    .map((item) => Number(item.high) - Number(item.low))
    .filter((value) => Number.isFinite(value) && value > 0);
  const typicalRange = ranges.length
    ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length
    : config.pipSize;
  const currentRange = Math.max(Number(candle.high) - Number(candle.low), 0);
  const volatilityMultiplier = clamp(currentRange / typicalRange, 1, 2.5);

  const utcHour = at.getUTCHours();
  const liquidityMultiplier = utcHour >= 20 || utcHour < 6 ? 1.75 : 1;

  return {
    pips: config.baseSpreadPips * volatilityMultiplier * liquidityMultiplier,
    source: "model",
  };
}

export function executableEntryPrice(params: {
  midPrice: number;
  side: "BUY" | "SELL";
  spreadPips: number;
  config: SymbolConfig;
}) {
  const halfSpread = (params.spreadPips * params.config.pipSize) / 2;
  return params.side === "BUY"
    ? params.midPrice + halfSpread
    : params.midPrice - halfSpread;
}
