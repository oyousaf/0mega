"use client";

import { registerPush } from "@/lib/notify/registerPush";
import { useLocalSettings } from "@/hooks/useLocalSettings";

export default function NotificationsPanel() {
  const { settings, save, ready } = useLocalSettings();

  if (!ready) return null;

  async function toggleWeb() {
    const p = await Notification.requestPermission();
    save({ web_enabled: p === "granted" });
  }

  async function togglePush() {
    const result = await registerPush();
    save({ push_enabled: result === "registered" });
  }

  /* Safe client-only local test notification */
  function testLocalNotification() {
    if (Notification.permission === "granted") {
      new Notification("Omega Test", {
        body: "Web notifications are working.",
      });
    }
  }

  return (
    <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-6">
      {/* Web ---------------------------------------------- */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-300 font-medium">Web Notifications</span>
        <button
          onClick={toggleWeb}
          className={`px-4 py-2 rounded font-semibold transition ${
            settings.web_enabled
              ? "bg-omega-gold text-black"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
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
          className={`px-4 py-2 rounded font-semibold transition ${
            settings.push_enabled
              ? "bg-omega-gold text-black"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
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
          className="h-5 w-5 accent-omega-gold"
          checked={settings.email_enabled}
          onChange={() => save({ email_enabled: !settings.email_enabled })}
        />
      </div>

      {/* Telegram ----------------------------------------- */}
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

      {/* Local Test Button -------------------------------- */}
      <div className="pt-4">
        <button
          onClick={testLocalNotification}
          className="w-full px-4 py-3 rounded-lg bg-omega-gold text-black font-semibold hover:opacity-90 transition"
        >
          Send Test Notification
        </button>
      </div>
    </div>
  );
}
