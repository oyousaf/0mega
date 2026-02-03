import { Signal } from "./types";

export function evaluateSignal(
  signal: Signal,
  price: number,
  hasOpenTrade: boolean,
) {
  const entry = Number(signal.entry_price);

  // Safety
  if (!Number.isFinite(entry) || !Number.isFinite(price)) {
    return null;
  }

  // Expiry
  if (signal.created_at) {
    const ageMs = Date.now() - new Date(signal.created_at).getTime();
    const ageDays = ageMs / 86400000;

    if (ageDays >= 7 && hasOpenTrade) {
      return { type: "EXPIRED_CLOSE" };
    }
  }

  // ENTRY
  if (!hasOpenTrade) {
    if (signal.direction === "BUY" && price >= entry) {
      return { type: "OPEN" };
    }

    if (signal.direction === "SELL" && price <= entry) {
      return { type: "OPEN" };
    }

    return null;
  }

  // MANAGEMENT
  if (signal.direction === "BUY") {
    if (signal.tp2 && price >= Number(signal.tp2)) return { type: "TP2_CLOSE" };
    if (signal.tp1 && price >= Number(signal.tp1))
      return { type: "TP1_PARTIAL" };
    if (signal.sl && price <= Number(signal.sl)) return { type: "SL_CLOSE" };
  }

  if (signal.direction === "SELL") {
    if (signal.tp2 && price <= Number(signal.tp2)) return { type: "TP2_CLOSE" };
    if (signal.tp1 && price <= Number(signal.tp1))
      return { type: "TP1_PARTIAL" };
    if (signal.sl && price >= Number(signal.sl)) return { type: "SL_CLOSE" };
  }

  return null;
}
