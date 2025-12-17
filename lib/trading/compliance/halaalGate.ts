type HalaalResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Halaal compliance gate
 */
export async function halaalGate(signal: any): Promise<HalaalResult> {
  // 1) Asset class check
  if (!signal.asset_class) {
    return { allowed: false, reason: "UNKNOWN_ASSET_CLASS" };
  }

  // Disallow explicitly haraam categories
  const forbiddenAssets = ["BOND", "INTEREST", "CFD"];

  if (forbiddenAssets.includes(signal.asset_class)) {
    return { allowed: false, reason: "HARAAM_ASSET_CLASS" };
  }

  // 2) Leverage check
  if (signal.leverage && signal.leverage > 1) {
    return { allowed: false, reason: "LEVERAGE_NOT_PERMITTED" };
  }

  // 3) Short selling check
  if (signal.direction === "SELL" && !signal.allow_short) {
    return { allowed: false, reason: "SHORT_SELLING_NOT_ALLOWED" };
  }

  // 4) Interest / swap flag
  if (signal.swap_fee === true) {
    return { allowed: false, reason: "INTEREST_BASED_SWAP" };
  }

  // 5) Explicit compliance override (future-proof)
  if (signal.halaal_override === false) {
    return { allowed: false, reason: "HALAAL_OVERRIDE_BLOCKED" };
  }

  return { allowed: true };
}
