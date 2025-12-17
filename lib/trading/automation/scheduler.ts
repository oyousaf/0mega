import { executeSignal } from "./executeSignal";
import { isAutomationEnabled } from "./automationState";

export async function automationTick(
  signalIds: string[],
  priceMap: Record<string, number>
) {
  if (!isAutomationEnabled()) return;

  for (const id of signalIds) {
    const price = priceMap[id];
    if (!price) continue;

    await executeSignal(id, price);
  }
}
