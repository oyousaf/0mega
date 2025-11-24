export function formatTimestamp(date: Date | string | null): string {
  if (!date) return "—";

  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  const diffMs = now.getTime() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);

  // < 1 min
  if (sec < 60) return "just now";

  // < 1 hour
  if (min < 60) return min === 1 ? "1 minute ago" : `${min} minutes ago`;

  // 59-minute cap
  if (min >= 60 && min < 120) return "1 hour ago";

  // < 24 hours
  if (hrs < 24) return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;

  // Yesterday
  if (days === 1) {
    return `yesterday at ${d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // < 7 days
  if (days < 7) return `${days} days ago`;

  // Older → Short UK format
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " at " +
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}
