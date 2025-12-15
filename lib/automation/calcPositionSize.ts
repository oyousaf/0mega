export function calcPositionSize(params: {
  balance: number;
  riskPct: number;
  entry: number;
  stop: number;
}): number {
  if (
    params.balance <= 0 ||
    params.riskPct <= 0 ||
    params.entry <= 0 ||
    params.stop <= 0 ||
    params.entry === params.stop
  ) {
    return 0;
  }

  const riskAmount = params.balance * params.riskPct;
  const riskPerUnit = Math.abs(params.entry - params.stop);

  return Number((riskAmount / riskPerUnit).toFixed(6));
}
