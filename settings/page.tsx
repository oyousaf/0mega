"use client";

import { FiBell, FiMail, FiSun, FiMoon } from "react-icons/fi";
import NotificationsPanel from "@/components/settings/NotificationsPanel";
import { useLocalSettings } from "@/hooks/useLocalSettings";

export default function SettingsPage() {
  const { settings, save, ready } = useLocalSettings();
  if (!ready) return null;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-10">
      {/* Title */}
      <h1 className="text-3xl font-bold text-omega-gold">Settings</h1>

      {/* -------------------------------------------------- */}
      {/* Notifications */}
      {/* -------------------------------------------------- */}
      <section className="p-6 rounded-xl border border-neutral-800 bg-neutral-900 space-y-6">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiBell size={22} />
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>

        <NotificationsPanel />

        {/* Tone */}
        <div className="pt-4">
          <label className="block text-neutral-300 font-medium mb-2">
            Alert Tone
          </label>

          <select
            value={settings.tone}
            onChange={(e) => save({ tone: e.target.value })}
            className="w-full p-2 rounded bg-omega-green text-black font-semibold"
          >
            <option value="tone1">Tone 1</option>
            <option value="tone2">Tone 2</option>
            <option value="tone3">Tone 3</option>
          </select>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* Messaging */}
      {/* -------------------------------------------------- */}
      <section className="p-6 rounded-xl border border-neutral-800 bg-neutral-900 space-y-4">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiMail size={22} />
          <h2 className="text-xl font-semibold">Message Channels</h2>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
          <span className="text-neutral-300">Email Alerts</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-omega-gold"
            checked={settings.email_enabled}
            onChange={() => save({ email_enabled: !settings.email_enabled })}
          />
        </div>

        {/* Telegram */}
        <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
          <span className="text-neutral-300">Telegram Alerts</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-omega-gold"
            checked={settings.telegram_enabled}
            onChange={() =>
              save({ telegram_enabled: !settings.telegram_enabled })
            }
          />
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* Appearance */}
      {/* -------------------------------------------------- */}
      <section className="p-6 rounded-xl border border-neutral-800 bg-neutral-900 space-y-4">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiSun size={22} />
          <h2 className="text-xl font-semibold">Appearance</h2>
        </div>

        <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
          <span className="text-neutral-300">Theme</span>

          <div className="flex items-center gap-4 text-neutral-400">
            <FiMoon />
            <input type="radio" disabled />
          </div>
        </div>
      </section>
    </main>
  );
}
