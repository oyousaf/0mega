import { executeSignal } from "./executeSignal";
import { isAutomationEnabled } from "./automationState";
import { unattendedRun } from "./unattendedRunner";

let running = false;

/* ---------------------------------------
   Pure dispatcher (used by runner)
---------------------------------------- */
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

/* ---------------------------------------
   Unattended loop controls
---------------------------------------- */
export async function startUnattended() {
  if (running) return;
  running = true;

  while (running) {
    try {
      await unattendedRun();
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      console.error("unattended loop error:", err);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
}

export function stopUnattended() {
  running = false;
}
