"use client";

import { registerPush } from "@/lib/notify/registerPush";
import { useLocalSettings } from "@/hooks/useLocalSettings";

export default function NotificationsPanel() {
  const { settings, save, ready } = useLocalSettings();

  if (!ready) return null;

  async function toggleWeb() {
    const permission = await Notification.requestPermission();
    save({ web_enabled: permission === "granted" });
  }

  async function togglePush() {
    const result = await registerPush();
    save({ push_enabled: result === "registered" });
  }

  return (
    <div className="p-5 rounded-xl bg-omega-green border border-neutral-800 space-y-6">
      {/* Web ---------------------------------------------- */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-300 font-medium">Web Notifications</span>
        <button
          onClick={toggleWeb}
          className={`px-4 py-2 rounded font-semibold ${
            settings.web_enabled
              ? "bg-omega-gold text-black"
              : "bg-neutral-800 text-neutral-400"
          }`}
        >
          {settings.web_enabled ? "Enabled" : "Enable"}
        </button>
      </div>

      {/* Push --------------------------------------------- */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-300 font-medium">Push Notifications</span>
        <button
          onClick={togglePush}
          className={`px-4 py-2 rounded font-semibold ${
            settings.push_enabled
              ? "bg-omega-gold text-black"
              : "bg-neutral-800 text-neutral-400"
          }`}
        >
          {settings.push_enabled ? "Enabled" : "Enable"}
        </button>
      </div>

      {/* Email -------------------------------------------- */}
      <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
        <span className="text-neutral-300">Email Alerts</span>
        <input
          type="checkbox"
          checked={settings.email_enabled}
          onChange={() => save({ email_enabled: !settings.email_enabled })}
          className="h-5 w-5 accent-omega-gold"
        />
      </div>

      {/* Telegram ----------------------------------------- */}
      <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
        <span className="text-neutral-300">Telegram Alerts</span>
        <input
          type="checkbox"
          checked={settings.telegram_enabled}
          onChange={() =>
            save({ telegram_enabled: !settings.telegram_enabled })
          }
          className="h-5 w-5 accent-omega-gold"
        />
      </div>
    </div>
  );
}
