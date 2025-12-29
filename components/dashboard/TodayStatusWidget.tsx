"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Status = {
  pnlToday: number;
  tradesToday: number;
  openTrades: number;
  lossUsedPct: number;
  tradingAllowed: boolean;
  lastTick: string;
};

export default function TodayStatusWidget() {
  const [data, setData] = useState<Status | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/engine/status/today", {
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Status API failed", res.status);
        return;
      }

      const text = await res.text();
      if (!text) return;

      setData(JSON.parse(text));
    } catch (err) {
      console.error("Failed to load engine status", err);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (!data) return null;

  const pnlColor =
    data.pnlToday > 0
      ? "text-green-400"
      : data.pnlToday < 0
      ? "text-red-400"
      : "text-neutral-300";

  const statusColor = data.tradingAllowed ? "text-green-400" : "text-red-500";

  const lossColor =
    data.lossUsedPct >= 80
      ? "text-red-400"
      : data.lossUsedPct >= 50
      ? "text-yellow-300"
      : "text-omega-gold";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="
        w-full max-w-6xl mx-auto
        rounded-xl p-4
        bg-omega-green
        border border-omega-dark-gold
        shadow-[0_0_18px_rgba(212,175,55,0.15)]
      "
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
        <Block label="TODAY PNL">
          <span className={`text-xl font-bold ${pnlColor}`}>
            {data.pnlToday.toFixed(2)}
          </span>
        </Block>

        <Block label="TRADES TODAY" value={data.tradesToday} />
        <Block label="OPEN TRADES" value={data.openTrades} />

        <Block label="LOSS USED">
          <span className={`text-lg font-bold ${lossColor}`}>
            {data.lossUsedPct.toFixed(1)}%
          </span>
        </Block>

        <Block label="STATUS">
          <span className={`text-lg font-bold ${statusColor}`}>
            {data.tradingAllowed ? "TRADING" : "FROZEN"}
          </span>
        </Block>

        <Block label="LAST TICK">
          <span className="text-xs opacity-70 tracking-wide">
            {data.lastTick
              ? new Date(data.lastTick).toLocaleTimeString("en-GB")
              : "—"}
          </span>
        </Block>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------
   BLOCK
-------------------------------------------------- */
function Block({
  label,
  value,
  children,
}: {
  label: string;
  value?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.65rem] tracking-widest opacity-60 text-omega-gold">
        {label}
      </span>

      {children ? (
        children
      ) : (
        <span className="text-lg font-semibold text-omega-gold">{value}</span>
      )}
    </div>
  );
}
