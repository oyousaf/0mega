"use client";

import { useEffect, useState } from "react";

type Summary = {
  daily: number;
  weekly: number;
  monthly: number;
};

export function usePnlSummary(pollMs = 5000) {
  const [summary, setSummary] = useState<Summary>({
    daily: 0,
    weekly: 0,
    monthly: 0,
  });

  async function load() {
    try {
      const res = await fetch("/api/trading/pnl-summary", {
        cache: "no-store",
      });
      const json = await res.json();

      if (
        typeof json.daily === "number" &&
        typeof json.weekly === "number" &&
        typeof json.monthly === "number"
      ) {
        setSummary(json);
      }
    } catch (err) {
      console.error("PNL summary load failed:", err);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return summary;
}
