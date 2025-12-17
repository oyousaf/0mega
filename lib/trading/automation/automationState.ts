let enabled = true;

export function isAutomationEnabled() {
  return enabled;
}

export function enableAutomation() {
  enabled = true;
}

export function disableAutomation() {
  enabled = false;
}
