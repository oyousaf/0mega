import { sendBrowserNotification } from "./browser";
import { sendPushNotification } from "./push";
import { sendEmail } from "./email";
import { sendTelegram } from "./telegram";

/**
 * Server-safe localStorage reader
 * (SSR-safe and Engine-safe)
 */
function readLocalSettings() {
  if (typeof window === "undefined") {
    return {
      web_enabled: false,
      push_enabled: true,
      email_enabled: true,
      telegram_enabled: true,
    };
  }

  try {
    const raw = localStorage.getItem("omega-settings");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export interface NotifyOptions {
  title: string;
  body: string;
}

export async function notify({ title, body }: NotifyOptions) {
  const user = readLocalSettings();

  try {
    if (user.web_enabled) sendBrowserNotification(title, body);
    if (user.push_enabled) await sendPushNotification(title, body);
    if (user.email_enabled) await sendEmail(title, body);
    if (user.telegram_enabled) await sendTelegram(`*${title}*\n${body}`);
  } catch (err) {
    console.error("Notify error:", err);
  }
}
