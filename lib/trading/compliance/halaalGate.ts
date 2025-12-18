/* -------------------------------------------------
   Sprint Mode Flags
-------------------------------------------------- */

const SPRINT_18_BYPASS = true;

type HalaalResult = { allowed: true } | { allowed: false; reason: string };

export async function halaalGate(signal: any): Promise<HalaalResult> {
  if (SPRINT_18_BYPASS) {
    return { allowed: true };
  }

  if (!signal.market) {
    return { allowed: false, reason: "UNKNOWN_ASSET_CLASS" };
  }

  switch (signal.market) {
    case "crypto":
      // Crypto compliance rules come here
      return { allowed: true };

    case "stock":
      // Shariah stock screening logic
      return { allowed: false, reason: "STOCK_SCREENING_NOT_IMPLEMENTED" };

    case "forex":
      // Forex compliance logic
      return { allowed: false, reason: "FOREX_COMPLIANCE_PENDING" };

    default:
      return { allowed: false, reason: "UNKNOWN_ASSET_CLASS" };
  }
}
