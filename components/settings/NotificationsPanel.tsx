"use client";

import { useState } from "react";
import { registerPush } from "@/lib/notify/registerPush";

export default function NotificationsPanel() {
  const [webStatus, setWebStatus] = useState("");
  const [pushStatus, setPushStatus] = useState("");

  async function enableWeb() {
    const permission = await Notification.requestPermission();
    setWebStatus(permission);
  }

  async function enablePush() {
    const result = await registerPush();
    setPushStatus(result);
  }

  return (
    <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900">
      <h2 className="text-xl font-semibold text-omega-gold">
        Notifications
      </h2>

      <div className="mt-4">
        <button
          onClick={enableWeb}
          className="px-4 py-2 rounded bg-omega-green text-black"
        >
          Enable Web Notifications
        </button>
        <p className="text-sm text-neutral-400 mt-2">
          Web status: {webStatus || "Pending"}
        </p>
      </div>

      <div className="mt-6">
        <button
          onClick={enablePush}
          className="px-4 py-2 rounded bg-omega-gold text-black"
        >
          Enable Push (Service Worker)
        </button>
        <p className="text-sm text-neutral-400 mt-2">
          Push status: {pushStatus || "Pending"}
        </p>
      </div>

      <audio id="omegaTone" src="/tones/tone1.mp3" preload="auto" />
    </div>
  );
}
