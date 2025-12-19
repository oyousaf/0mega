type Stats = { count: number; avgMs: number };

const stats: Record<string, Stats> = {};

export function recordLatency(brokerName: string, ms: number) {
  const s = stats[brokerName] ?? { count: 0, avgMs: 0 };
  s.avgMs = (s.avgMs * s.count + ms) / (s.count + 1);
  s.count += 1;
  stats[brokerName] = s;
}

export function getLatency(brokerName: string): number {
  return stats[brokerName]?.avgMs ?? Number.POSITIVE_INFINITY;
}
