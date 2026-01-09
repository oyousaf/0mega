import { isAutomationEnabled } from "./automationState";
import { unattendedRun } from "./unattendedRunner";

let running = false;

/* ---------------------------------------
   Scheduler
   Responsibility:
   - Check automation state
   - Start unattended runner loop
---------------------------------------- */
export async function startUnattended() {
  if (running) return;
  running = true;

  while (running) {
    try {
      const enabled = await isAutomationEnabled();
      if (enabled) {
        await unattendedRun();
      }

      await sleep(5000);
    } catch (err) {
      console.error("[SCHEDULER] unattended error:", err);
      await sleep(10_000);
    }
  }
}

export function stopUnattended() {
  running = false;
}

/* ---------------------------------------
   Utils
---------------------------------------- */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
