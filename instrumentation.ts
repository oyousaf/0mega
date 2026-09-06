export function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.OMEGA_ENGINE_ENABLED?.toLowerCase() !== "true"
  ) {
    return;
  }

  setTimeout(() => {
    void import("@/lib/engine/priceLoop")
      .then(({ startPriceLoop }) => startPriceLoop())
      .catch((error: unknown) => {
        console.error("[ENGINE_STARTUP_FAILED]", error);
      });
  }, 1_000);
}
