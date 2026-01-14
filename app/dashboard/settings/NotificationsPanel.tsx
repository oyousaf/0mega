"use client";

import { FiBell, FiSend, FiMail } from "react-icons/fi";
import { registerPush } from "@/lib/notify/registerPush";
import { useLocalSettings } from "@/hooks/useLocalSettings";

export default function NotificationsPanel() {
  const { settings, save, ready } = useLocalSettings();
  if (!ready) return null;

  async function testWeb() {
    if (Notification.permission !== "granted") {
      alert("Web notifications not enabled.");
      return;
    }
    new Notification("Omega Web Test", {
      body: "Web notifications are working.",
    });
  }

  async function testPush() {
    const { sendPushNotification } = await import("@/lib/notify/push");
    await sendPushNotification(
      "Omega Push Test",
      "Push notification delivered."
    );
    alert("Push test triggered.");
  }

  async function testEmail() {
    const { sendEmail } = await import("@/lib/notify/email");
    await sendEmail("Omega Email Test", "Email delivery OK.");
    alert("Email sent.");
  }

  async function testTelegram() {
    const { sendTelegram } = await import("@/lib/notify/telegram");
    await sendTelegram("*Omega Telegram Test*\nBot operational.");
    alert("Telegram sent.");
  }

  async function testFullPipeline() {
    const { notify } = await import("@/lib/notify");
    await notify({
      title: "Omega Pipeline Test",
      body: "Web + Push + Email + Telegram",
    });
    alert("Pipeline executed.");
  }

  return (
    <div className="rounded-xl border border-omega-dark-gold bg-black/30 p-5 space-y-6">
      <h3 className="text-lg font-semibold text-omega-gold flex items-center gap-2">
        <FiBell /> Channels
      </h3>

      {/* WEB */}
      <div className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiBell />
          <span>Web Notifications</span>
        </div>
        <button
          onClick={async () => {
            const p = await Notification.requestPermission();
            save({ web_enabled: p === "granted" });
          }}
          className={`px-3 py-1.5 rounded text-sm font-semibold
            ${
              settings.web_enabled
                ? "bg-green-500 text-black"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
        >
          {settings.web_enabled ? "Enabled" : "Enable"}
        </button>
      </div>

      {/* PUSH */}
      <div className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2 text-omega-gold">
          <FiSend />
          <span>Push Notifications</span>
        </div>
        <button
          onClick={async () => {
            const r = await registerPush();
            save({ push_enabled: r === "registered" });
          }}
          className={`px-3 py-1.5 rounded text-sm font-semibold
            ${
              settings.push_enabled
                ? "bg-green-500 text-black"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
        >
          {settings.push_enabled ? "Enabled" : "Enable"}
        </button>
      </div>

      {/* DIAGNOSTICS */}
      <div className="pt-4 border-t border-neutral-700 space-y-2">
        <p className="text-xs uppercase tracking-wider text-neutral-400">
          Diagnostics
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button className="omega-test-btn" onClick={testWeb}>
            Test Web
          </button>
          <button className="omega-test-btn" onClick={testPush}>
            Test Push
          </button>
          <button className="omega-test-btn" onClick={testEmail}>
            Test Email
          </button>
          <button className="omega-test-btn" onClick={testTelegram}>
            Test Telegram
          </button>
        </div>

        <button
          onClick={testFullPipeline}
          className="w-full mt-3 omega-button"
        >
          Run Full Pipeline Test
        </button>
      </div>
    </div>
  );
}
