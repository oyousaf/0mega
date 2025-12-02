"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FiBell, FiCpu, FiMail, FiSun, FiMoon } from "react-icons/fi";

import NotificationsPanel from "@/components/settings/NotificationsPanel";

export default function SettingsPage() {
  const [tone, setTone] = useState("tone1");

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-10">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-omega-gold">Settings</h1>
      </div>

      {/* -------------------------------------------------- */}
      {/* Notifications */}
      {/* -------------------------------------------------- */}
      <section className="p-6 rounded-xl border border-neutral-800 bg-neutral-900 space-y-4">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiBell size={22} />
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>

        {/* Fully working notifications panel */}
        <NotificationsPanel />

        {/* Alert Tone Selection */}
        <div className="mt-6">
          <label className="block text-neutral-300 font-medium mb-2">
            Alert Tone (Sprint 13 Stub)
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full p-2 rounded bg-omega-green text-black font-semibold"
          >
            <option value="tone1">Tone 1 (Default)</option>
            <option value="tone2">Tone 2</option>
            <option value="tone3">Tone 3</option>
          </select>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* Telegram + Email */}
      {/* -------------------------------------------------- */}
      <section className="p-6 rounded-xl border border-neutral-800 bg-neutral-900 space-y-4">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiMail size={22} />
          <h2 className="text-xl font-semibold">Message Channels</h2>
        </div>

        <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
          <span className="text-neutral-300">
            Telegram Alerts (Coming Sprint 12)
          </span>
          <input type="checkbox" disabled className="h-5 w-5" />
        </div>

        <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
          <span className="text-neutral-300">
            Email Alerts (Coming Sprint 12)
          </span>
          <input type="checkbox" disabled className="h-5 w-5" />
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* Engine */}
      {/* -------------------------------------------------- */}
      <section className="p-6 rounded-xl border border-neutral-800 bg-neutral-900 space-y-4">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiCpu size={22} />
          <h2 className="text-xl font-semibold">Engine Control</h2>
        </div>

        <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
          <span className="text-neutral-300">Auto-run Engine (Sprint 13)</span>
          <input type="checkbox" disabled className="h-5 w-5" />
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* Theme Settings */}
      {/* -------------------------------------------------- */}
      <section className="p-6 rounded-xl border border-neutral-800 bg-neutral-900 space-y-4">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiSun size={22} />
          <h2 className="text-xl font-semibold">Appearance</h2>
        </div>

        <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
          <span className="text-neutral-300">Theme (Sprint 14)</span>

          <div className="flex items-center gap-2 text-neutral-400">
            <FiMoon />
            <input type="radio" disabled />
            <FiSun />
            <input type="radio" disabled />
          </div>
        </div>
      </section>
    </main>
  );
}
