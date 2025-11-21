import { fetchMockPrice } from "./prices";

/**
 * Evaluates a signal’s trading state.
 * @returns updated status string.
 */
export async function evaluateSignal(signal: any): Promise<string> {
  const current = await fetchMockPrice(signal.symbol);

  // Define thresholds
  const entry = Number(signal.entry_price);
  const tp1 = Number(signal.tp1);
  const tp2 = Number(signal.tp2);
  const sl = Number(signal.sl);

  // Safety check
  if ([entry, tp1, tp2, sl].some((v) => isNaN(v))) return "INVALID";

  if (current >= tp2) return "TP2 HIT";
  if (current >= tp1) return "TP1 HIT";
  if (current <= sl) return "SL HIT";
  return "ACTIVE";
}

/**
 * Evaluates a list of signals concurrently.
 */
export async function evaluateAllSignals(signals: any[]) {
  return Promise.all(
    signals.map(async (s) => {
      const current = await fetchMockPrice(s.symbol);
      const status = await evaluateSignal({ ...s, current_price: current });
      return { ...s, current_price: current, status };
    })
  );
}
