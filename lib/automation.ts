export function simulateSignalStatus(signal: any) {
  if (signal.status !== "active") return signal.status;

  const rnd = Math.random();
  if (rnd > 0.9) return "TP2 HIT";
  if (rnd > 0.7) return "TP1 HIT";
  if (rnd < 0.1) return "SL HIT";
  return "ACTIVE";
}
