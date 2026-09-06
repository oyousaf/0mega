"use client";

import { FiBell, FiSend } from "react-icons/fi";
import { registerPush } from "@/lib/notify/registerPush";
import { useLocalSettings } from "@/hooks/useLocalSettings";

export default function NotificationsPanel() {
  const { settings, save, ready } = useLocalSettings();
  if (!ready) return null;

  async function testWeb() {
    if (Notification.permission !== "granted") return;
    new Notification("Omega Web Test", { body: "Web notifications OK." });
  }

  async function testChannel(channel: "push" | "email" | "telegram" | "all") {
    const response = await fetch("/api/notifications/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    if (!response.ok) throw new Error("Notification test failed");
  }

  return (
    <div className="rounded-xl border border-omega-dark-gold bg-black/30 p-5 space-y-6">
      <h3 className="text-lg font-semibold text-omega-gold flex items-center gap-2">
        <FiBell /> Channels
      </h3>

      <div className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3">
        <span className="text-omega-gold">Web Notifications</span>
        <button
          onClick={async () => {
            const p = await Notification.requestPermission();
            save({ web_enabled: p === "granted" });
          }}
          className="omega-test-btn"
        >
          {settings.web_enabled ? "Enabled" : "Enable"}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-black/40 px-4 py-3">
        <span className="text-omega-gold flex items-center gap-2">
          <FiSend /> Push Notifications
        </span>
        <button
          onClick={async () => {
            const r = await registerPush();
            save({ push_enabled: r === "registered" });
          }}
          className="omega-test-btn"
        >
          {settings.push_enabled ? "Enabled" : "Enable"}
        </button>
      </div>

      <div className="pt-4 border-t border-neutral-700 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button className="omega-test-btn" onClick={testWeb}>
            Test Web
          </button>
          <button className="omega-test-btn" onClick={() => void testChannel("push")}>
            Test Push
          </button>
          <button className="omega-test-btn" onClick={() => void testChannel("email")}>
            Test Email
          </button>
          <button className="omega-test-btn" onClick={() => void testChannel("telegram")}>
            Test Telegram
          </button>
        </div>

        <button
          onClick={() => void testChannel("all")}
          className="w-full mt-3 omega-button transition-colors duration-300"
        >
          Run Full Pipeline Test
        </button>
      </div>
    </div>
  );
}
