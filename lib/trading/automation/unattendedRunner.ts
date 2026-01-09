import { isAutomationEnabled } from "./automationState";
import { startPriceLoop } from "@/lib/engine/priceLoop";

let started = false;

/**
 * Unattended runner
 * Responsibility:
 * - Ensure the price loop is running when automation is enabled
 */
export async function unattendedRun() {
  const enabled = await isAutomationEnabled();
  if (!enabled) return;

  if (started) return;

  started = true;
  startPriceLoop();
}
