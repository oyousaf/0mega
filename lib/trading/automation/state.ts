let running = false;
let lastRunAt: string | null = null;
let lastResult: any = null;

export function acquireLock(): boolean {
  if (running) return false;
  running = true;
  return true;
}

export function releaseLock(result?: any) {
  running = false;
  lastRunAt = new Date().toISOString();
  if (result) lastResult = result;
}

export function getAutomationState() {
  return {
    running,
    lastRunAt,
    lastResult,
  };
}
