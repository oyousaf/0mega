// -----------------------------------------------------
// CANONICAL STATUS CONSTANTS
// -----------------------------------------------------
export const ALLOWED_STATUSES = [
  "ACTIVE",
  "TP1 HIT",
  "TP2 HIT",
  "SL HIT",
  "EXPIRED",
  "CLOSED",
] as const;

export type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

// Engine formats everything as SNAKE_CASE, UI uses pretty form.
// These utilities ensure the correct mapping in all directions.

/** Convert DB/raw/engine status → PRETTY UI version */
export function prettyStatus(raw: string | null | undefined): AllowedStatus {
  const formatted = (raw || "ACTIVE").replace(/_/g, " ").toUpperCase();

  if (ALLOWED_STATUSES.includes(formatted as AllowedStatus)) {
    return formatted as AllowedStatus;
  }

  return "ACTIVE";
}

/** Convert PRETTY → CANONICAL snake_case (engine storage format) */
export function canonicalStatus(pretty: string): string {
  return pretty.toUpperCase().replace(/ /g, "_");
}

/** True if the status means the signal is finished/closed */
export function isClosedStatus(status: AllowedStatus | string): boolean {
  const s = status.toUpperCase();
  return (
    s === "CLOSED" ||
    s === "TP1 HIT" ||
    s === "TP2 HIT" ||
    s === "SL HIT" ||
    s === "EXPIRED"
  );
}

/** True if the status is truly active/trade live */
export function isActiveStatus(status: AllowedStatus | string): boolean {
  return status.toUpperCase() === "ACTIVE";
}
