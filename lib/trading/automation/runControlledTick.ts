import { runAutomationTick } from "./runAutomationTick";
import { acquireLock, releaseLock } from "./state";

export async function runControlledTick() {
  if (!acquireLock()) {
    return {
      skipped: true,
      reason: "Automation already running",
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const result = await runAutomationTick();
    releaseLock(result);
    return { skipped: false, ...result };
  } catch (err: any) {
    releaseLock({ error: err?.message ?? String(err) });
    throw err;
  }
}
