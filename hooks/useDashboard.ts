import { useEffect, useState } from "react";
import type { Trade } from "@/types/trade";

export type OpenTrade = {
  trade_id: number;
  symbol: string;
  side: "BUY" | "SELL";
  entry_price: number;
  qty: number;
  opened_at: string;
  sl: number | null;
  tp1: number | null;
  rr: number | null;
  mark_price?: number | null;
  unrealised_pl?: number | null;
};

/* ---------------------------------------
DASHBOARD PAYLOAD TYPE
--------------------------------------- */

export type DashboardPayload = {
  engine?: {
    tradingAllowed?: boolean;
    running?: boolean;
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

  openTrades?: OpenTrade[];
  tradeHistory?: Trade[];

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

  marketEvents?: {
    id: number;
    currency: string;
    title: string;
    impact: "HIGH" | "MEDIUM" | "LOW";
    starts_at: string;
    ends_at: string;
    is_active: boolean;
  }[];
};

/* ---------------------------------------
SHARED STATE (SINGLETON)
--------------------------------------- */

let cache: DashboardPayload | null = null;

const listeners = new Set<(d: DashboardPayload | null) => void>();

let timer: ReturnType<typeof setInterval> | null = null;

let fetching = false;

/* ---------------------------------------
FETCH DASHBOARD
--------------------------------------- */

async function fetchDashboard() {
  if (fetching) return;

  fetching = true;

  try {
    const res = await fetch("/api/dashboard", {
      cache: "no-store",
    });

    if (!res.ok) return;

    const json: DashboardPayload = await res.json();

    const changed =
      !cache ||
      json.engine?.openTrades !== cache.engine?.openTrades ||
      json.engine?.pnlToday !== cache.engine?.pnlToday ||
      json.tradeHistory?.length !== cache.tradeHistory?.length ||
      json.automation?.enabled !== cache.automation?.enabled ||
      json.marketEvents?.[0]?.id !== cache.marketEvents?.[0]?.id;

    if (changed) {
      cache = json;
      listeners.forEach((l) => l(cache));
    }
  } catch (err) {
    console.error("Dashboard fetch failed", err);
  } finally {
    fetching = false;
  }
}

/* ---------------------------------------
MANUAL REFRESH
--------------------------------------- */

export async function refreshDashboard() {
  await fetchDashboard();
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

    /* ---------------------------------
    REALTIME TRADE EVENT REFRESH
    --------------------------------- */

    function handleTradeUpdate() {
      fetchDashboard();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("omega-trade-update", handleTradeUpdate);
    }

    return () => {
      listeners.delete(setData);

      if (typeof window !== "undefined") {
        window.removeEventListener("omega-trade-update", handleTradeUpdate);
      }

      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [interval]);

  return data;
}
