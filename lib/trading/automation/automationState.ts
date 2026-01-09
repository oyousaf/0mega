let enabled = true;

export async function isAutomationEnabled(): Promise<boolean> {
  return enabled;
}

export async function enableAutomation() {
  enabled = true;
}

export async function disableAutomation() {
  enabled = false;
}
