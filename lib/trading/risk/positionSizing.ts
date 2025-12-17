type PositionSizingInput = {
  equity: number;
  entry: number;
  stopLoss: number;
  riskPct: number;
};

export function calculatePositionSize({
  equity,
  entry,
  stopLoss,
  riskPct,
}: PositionSizingInput): number {
  if (equity <= 0) return 0;
  if (riskPct <= 0) return 0;

  const riskPerUnit = Math.abs(entry - stopLoss);
  if (riskPerUnit <= 0) return 0;

  const maxRiskAmount = equity * riskPct;
  const qty = maxRiskAmount / riskPerUnit;

  return Math.floor(qty);
}
