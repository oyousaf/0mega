"use client";

import { registerPush } from "@/lib/notify/registerPush";
import { useLocalSettings } from "@/hooks/useLocalSettings";

export default function NotificationsPanel() {
  const { settings, save, ready } = useLocalSettings();
  if (!ready) return null;

  /* ---------------------------------------------- */
  /*  INDIVIDUAL CHANNEL TEST FUNCTIONS            */
  /* ---------------------------------------------- */

  // 1) Web Notification (client-only)
  function testWeb() {
    if (Notification.permission !== "granted") {
      alert("Web notifications not enabled yet.");
      return;
    }
    new Notification("Omega Web Test", {
      body: "Web notifications are working.",
    });
  }

  // 2) Push Notification (server → device)
  async function testPush() {
    const { sendPushNotification } = await import("@/lib/notify/push");
    await sendPushNotification(
      "Omega Push Test",
      "Push notification delivered successfully."
    );
    alert("Push test triggered (check device).");
  }

  // 3) Email Test
  async function testEmail() {
    const { sendEmail } = await import("@/lib/notify/email");
    await sendEmail("Omega Email Test", "Your Omega email notification works.");
    alert("Email test sent (check inbox).");
  }

  // 4) Telegram Test
  async function testTelegram() {
    const { sendTelegram } = await import("@/lib/notify/telegram");
    await sendTelegram("*Omega Telegram Test*\nYour bot is working.");
    alert("Telegram test sent (check bot).");
  }

  // 5) Full notify() Pipeline Test
  async function testFullPipeline() {
    const { notify } = await import("@/lib/notify/index");
    await notify({
      title: "Omega Full Pipeline Test",
      body: "Testing: Web + Push + Email + Telegram",
    });
    alert("Full notify() pipeline executed.");
  }

  /* ---------------------------------------------- */
  /*  RENDER                                         */
  /* ---------------------------------------------- */

  return (
    <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-6">
      {/* WEB NOTIFICATIONS */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-300 font-medium">Web Notifications</span>
        <button
          onClick={async () => {
            const p = await Notification.requestPermission();
            save({ web_enabled: p === "granted" });
          }}
          className={`px-4 py-2 rounded font-semibold transition ${
            settings.web_enabled
              ? "bg-omega-gold text-black"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          {settings.web_enabled ? "Enabled" : "Enable"}
        </button>
      </div>

      {/* PUSH NOTIFICATIONS */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-300 font-medium">Push Notifications</span>
        <button
          onClick={async () => {
            const r = await registerPush();
            save({ push_enabled: r === "registered" });
          }}
          className={`px-4 py-2 rounded font-semibold transition ${
            settings.push_enabled
              ? "bg-omega-gold text-black"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          {settings.push_enabled ? "Enabled" : "Enable"}
        </button>
      </div>

      {/* EMAIL */}
      <div className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg">
        <span className="text-neutral-300">Email Alerts</span>
        <input
          type="checkbox"
          checked={settings.email_enabled}
          onChange={() => save({ email_enabled: !settings.email_enabled })}
          className="h-5 w-5 accent-omega-gold"
        />
      </div>

      {/* TELEGRAM */}
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

      {/* TEST BUTTONS */}
      <div className="pt-4 space-y-3">
        <button
          onClick={testWeb}
          className="w-full px-4 py-3 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
        >
          Test Web Notification
        </button>

        <button
          onClick={testPush}
          className="w-full px-4 py-3 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
        >
          Test Push Notification
        </button>

        <button
          onClick={testEmail}
          className="w-full px-4 py-3 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
        >
          Test Email Alert
        </button>

        <button
          onClick={testTelegram}
          className="w-full px-4 py-3 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
        >
          Test Telegram Alert
        </button>

        <button
          onClick={testFullPipeline}
          className="w-full px-4 py-3 rounded-lg bg-omega-gold text-black font-semibold hover:opacity-90 transition"
        >
          Test Full Pipeline
        </button>
      </div>
    </div>
  );
}
