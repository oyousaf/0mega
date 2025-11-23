export function formatStatus(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/_/g, " ").toUpperCase();
}
