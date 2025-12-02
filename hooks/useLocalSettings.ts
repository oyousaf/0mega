"use client";

import { useEffect, useState } from "react";

const KEY = "omega-settings";

const DEFAULTS = {
  web_enabled: true,
  push_enabled: true,
  email_enabled: false,
  telegram_enabled: false,
  tone: "tone1",
};

export function useLocalSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);

  // Load from localStorage on first mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setSettings({ ...DEFAULTS, ...parsed });
      } catch {}
    }

    setReady(true);
  }, []);

  // Save function
  function save(updates: Partial<typeof DEFAULTS>) {
    const next = { ...settings, ...updates };
    setSettings(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  return { settings, save, ready };
}
