export type BrokerLogEvent =
  | { type: "SELECTED"; market: string; broker: string }
  | { type: "SKIPPED"; market: string; broker: string; reason: string }
  | { type: "FAILED"; market: string; broker: string; error: string };

export function logBrokerEvent(e: BrokerLogEvent) {
  const base = `[BROKER][${e.market}]`;
  if (e.type === "SELECTED") {
    console.log(`${base} selected=${e.broker}`);
  }
  if (e.type === "SKIPPED") {
    console.warn(`${base} skipped=${e.broker} reason=${e.reason}`);
  }
  if (e.type === "FAILED") {
    console.error(`${base} failed=${e.broker} error=${e.error}`);
  }
}
