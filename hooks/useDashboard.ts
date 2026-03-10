import { useEffect, useState } from "react";

/* ---------------------------------------
DASHBOARD PAYLOAD TYPE
--------------------------------------- */

export type DashboardPayload = {
  engine?: {
    tradingAllowed?: boolean;
    openTrades?: number;
    tradesToday?: number;
    pnlToday?: number;
    lastTick?: string;
    lossUsedPct?: number;
  };

  automation?: {
    enabled?: boolean;
  };

  metrics?: {
    winRate?: number | string;
    expectancy?: number | string;
    profitFactor?: number | string;
    halaalRatio?: number | string;
  };

  openTrades?: any[];

  tradeHistory?: any[];

  pnlSummary?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };

  account?: {
    balance?: number;
  };

  equityCurve?: {
    closed_at: string;
    equity: number;
    drawdown: number;
  }[];
};

/* ---------------------------------------
SHARED STATE (singleton)
--------------------------------------- */

let cache: DashboardPayload | null = null;
let listeners: Set<(d: DashboardPayload | null) => void> = new Set();
let timer: NodeJS.Timeout | null = null;

/* ---------------------------------------
FETCH FUNCTION
--------------------------------------- */

async function fetchDashboard() {
  try {
    const res = await fetch("/api/dashboard", {
      cache: "no-store",
    });

    if (!res.ok) return;

    const json: DashboardPayload = await res.json();

    cache = json;

    listeners.forEach((l) => l(cache));
  } catch (err) {
    console.error("Dashboard fetch failed", err);
  }
}

/* ---------------------------------------
HOOK
--------------------------------------- */

export function useDashboard(interval = 15000) {
  const [data, setData] = useState<DashboardPayload | null>(cache);

  useEffect(() => {
    listeners.add(setData);

    if (!cache) fetchDashboard();

    if (!timer) {
      timer = setInterval(fetchDashboard, interval);
    }

    return () => {
      listeners.delete(setData);

      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [interval]);

  return data;
}
