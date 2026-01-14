"use client";

import { FiBell, FiMail, FiSun, FiMoon, FiSend } from "react-icons/fi";
import NotificationsPanel from "@/app/dashboard/settings/NotificationsPanel";
import { useLocalSettings } from "@/hooks/useLocalSettings";

export default function SettingsPage() {
  const { settings, save, ready } = useLocalSettings();
  if (!ready) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <h1 className="text-3xl font-bold text-omega-gold">Settings</h1>

      {/* NOTIFICATIONS */}
      <section className="rounded-xl border border-omega-dark-gold bg-omega-green p-6 space-y-6">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiBell size={22} />
          <h2 className="text-xl font-semibold">Notifications</h2>
        </div>

        <NotificationsPanel />

        {/* ALERT TONE */}
        <div>
          <label className="block text-omega-gold/80 font-medium mb-2">
            Alert Tone
          </label>
          <select
            value={settings.tone}
            onChange={(e) => save({ tone: e.target.value })}
            className="w-full rounded-lg bg-black/40 text-omega-gold px-3 py-2
              border border-omega-dark-gold focus:outline-none"
          >
            <option value="tone1">Tone 1</option>
            <option value="tone2">Tone 2</option>
            <option value="tone3">Tone 3</option>
          </select>
        </div>
      </section>

      {/* MESSAGE CHANNELS */}
      <section className="rounded-xl border border-omega-dark-gold bg-omega-green p-6 space-y-4">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiMail size={22} />
          <h2 className="text-xl font-semibold">Message Channels</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3">
            <div className="flex items-center gap-2 text-omega-gold">
              <FiMail />
              <span>Email Alerts</span>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-omega-gold"
              checked={settings.email_enabled}
              onChange={() => save({ email_enabled: !settings.email_enabled })}
            />
          </label>

          <label className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3">
            <div className="flex items-center gap-2 text-omega-gold">
              <FiSend />
              <span>Telegram Alerts</span>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 accent-omega-gold"
              checked={settings.telegram_enabled}
              onChange={() =>
                save({ telegram_enabled: !settings.telegram_enabled })
              }
            />
          </label>
        </div>
      </section>

      {/* APPEARANCE */}
      <section className="rounded-xl border border-omega-dark-gold bg-omega-green p-6 space-y-4">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiSun size={22} />
          <h2 className="text-xl font-semibold">Appearance</h2>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3">
          <span className="text-omega-gold/80">Theme</span>
          <div className="flex items-center gap-3 text-omega-gold/60">
            <FiMoon />
            <input type="radio" disabled />
          </div>
        </div>
      </section>
    </main>
  );
}
