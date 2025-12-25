type EquityPoint = {
  t: number;
  equity: number;
};

type ParityResult = {
  drift: number;
  driftPct: number;
  ok: boolean;
};

const DEFAULT_TOLERANCE_PCT = 0.005; // 0.5%

export function checkEquityParity(params: {
  expected: EquityPoint[];
  realised: EquityPoint[];
  tolerancePct?: number;
}): ParityResult {
  const tol = params.tolerancePct ?? DEFAULT_TOLERANCE_PCT;

  if (!params.expected.length || !params.realised.length) {
    return { drift: 0, driftPct: 0, ok: true };
  }

  const expEnd = params.expected[params.expected.length - 1].equity;
  const realEnd = params.realised[params.realised.length - 1].equity;

  const drift = realEnd - expEnd;
  const driftPct = drift / expEnd;

  return {
    drift,
    driftPct,
    ok: Math.abs(driftPct) <= tol,
  };
}
