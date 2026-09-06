"use client";

import { useSyncExternalStore } from "react";

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

let currentSettings: OmegaSettings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function loadSettings() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) currentSettings = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    currentSettings = DEFAULTS;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  loadSettings();
  return currentSettings;
}

function getServerSnapshot() {
  return DEFAULTS;
}

export function useLocalSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Safe setter
  function save(updates: Partial<OmegaSettings>) {
    const next = { ...settings, ...updates };
    currentSettings = next;
    localStorage.setItem(KEY, JSON.stringify(next));
    listeners.forEach((listener) => listener());
  }

  return { settings, save, ready: typeof window !== "undefined" };
}
