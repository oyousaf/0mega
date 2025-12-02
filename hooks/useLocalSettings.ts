"use client";

import { useEffect, useState } from "react";

const KEY = "omega-settings";

export interface OmegaSettings {
  web_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  telegram_enabled: boolean;
  tone: string;
}

const DEFAULTS: OmegaSettings = {
  web_enabled: false,
  push_enabled: false,
  email_enabled: false,
  telegram_enabled: false,
  tone: "tone1",
};

export function useLocalSettings() {
  const [settings, setSettings] = useState<OmegaSettings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings({ ...DEFAULTS, ...parsed });
      }
    } catch {}

    setReady(true);
  }, []);

  // Safe setter
  function save(updates: Partial<OmegaSettings>) {
    const next = { ...settings, ...updates };
    setSettings(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  return { settings, save, ready };
}
