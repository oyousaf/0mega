"use client";

import { useEffect, useState } from "react";
import SmartToyIcon from "@mui/icons-material/SmartToy";

export default function AutomationBadge() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  async function load() {
    const res = await fetch("/api/automation/status", { cache: "no-store" });
    const json = await res.json();
    setEnabled(Boolean(json.automation?.enabled ?? json.enabled));
  }

  async function toggle() {
    if (enabled === null) return;
    await fetch("/api/automation/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    setEnabled(!enabled);
  }

  useEffect(() => {
    load();
  }, []);

  if (enabled === null) return null;

  return (
    <button
      onClick={toggle}
      title={enabled ? "Automation ON" : "Automation OFF"}
      className={`
        relative z-50
        p-2 rounded-full
        bg-black/50
        border border-omega-dark-gold
        ${enabled ? "text-green-400" : "text-red-400"}
        hover:scale-105 transition
      `}
    >
      <SmartToyIcon fontSize="small" />
    </button>
  );
}
