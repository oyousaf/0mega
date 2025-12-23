export function isUsMarketOpen(date = new Date()): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;

  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();

  return minutes >= 870 && minutes < 1260;
}
