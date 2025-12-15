"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button, Card, CardContent } from "@mui/material";

type StatusPayload = {
  automation: {
    enabled: boolean;
    mode: string;
  };
  broker: {
    name: string;
    balance: {
      equity: number;
      cash: number;
    };
    openPositions: number;
  };
  database: {
    paper_trades: number;
    trade_executions: number;
  };
  timestamp: string;
};

export default function AutomationStatusClient() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function loadStatus() {
    const res = await fetch("/api/automation/status", {
      cache: "no-store",
    });
    const json = await res.json();
    setStatus(json);
  }

  async function runTestTick() {
    setLoading(true);
    try {
      const res = await fetch("/api/automation/tick", { method: "GET" });
      const json = await res.json();
      setLastRun(json.timestamp ?? new Date().toISOString());
      await loadStatus();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    const id = setInterval(loadStatus, 5000);
    return () => clearInterval(id);
  }, []);

  if (!status) return null;

  const card = {
    background: "var(--omega-green)",
    border: "1px solid var(--omega-dark-gold)",
    borderRadius: "1rem",
    color: "var(--omega-gold)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <h1 className="text-3xl font-semibold text-omega-gold text-center">
        ⚙️ Automation Control
      </h1>

      {/* STATUS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card sx={card}>
          <CardContent>
            <div className="text-sm opacity-70">AUTOMATION MODE</div>
            <div className="text-xl font-bold">
              {status.automation.mode.toUpperCase()}
            </div>
          </CardContent>
        </Card>

        <Card sx={card}>
          <CardContent>
            <div className="text-sm opacity-70">BROKER</div>
            <div className="text-xl font-bold">
              {status.broker.name.toUpperCase()}
            </div>
          </CardContent>
        </Card>

        <Card sx={card}>
          <CardContent>
            <div className="text-sm opacity-70">OPEN POSITIONS</div>
            <div className="text-xl font-bold">
              {status.broker.openPositions}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FINANCIALS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card sx={card}>
          <CardContent>
            <div className="text-sm opacity-70">EQUITY</div>
            <div className="text-xl font-bold">
              £{status.broker.balance.equity.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card sx={card}>
          <CardContent>
            <div className="text-sm opacity-70">CASH</div>
            <div className="text-xl font-bold">
              £{status.broker.balance.cash.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DATABASE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card sx={card}>
          <CardContent>
            <div className="text-sm opacity-70">PAPER TRADES</div>
            <div className="text-xl font-bold">
              {status.database.paper_trades}
            </div>
          </CardContent>
        </Card>

        <Card sx={card}>
          <CardContent>
            <div className="text-sm opacity-70">EXECUTIONS</div>
            <div className="text-xl font-bold">
              {status.database.trade_executions}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col items-center gap-3 mt-6">
        <Button
          onClick={runTestTick}
          disabled={loading}
          sx={{
            backgroundColor: "var(--omega-gold)",
            color: "var(--omega-green)",
            fontWeight: 700,
            px: 4,
            py: 1.2,
            "&:hover": { opacity: 0.9 },
          }}
        >
          {loading ? "RUNNING…" : "TEST AUTOMATION"}
        </Button>

        <div className="text-xs opacity-70">
          Last tick:{" "}
          {lastRun
            ? new Date(lastRun).toLocaleString("en-GB")
            : new Date(status.timestamp).toLocaleString("en-GB")}
        </div>
      </div>
    </motion.div>
  );
}
