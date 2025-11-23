export function formatStatus(raw: string | null | undefined): string {
  if (!raw) return "ACTIVE";
  return raw.replace(/_/g, " ").toUpperCase();
}