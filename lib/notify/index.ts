import { sendBrowserNotification } from "./browser";
import { sendPushNotification } from "./push";
import { sendEmail } from "./email";
import { sendTelegram } from "./telegram";

export interface NotifyOptions {
  title: string;
  body: string;
  channels?: {
    web?: boolean;
    push?: boolean;
    email?: boolean;
    telegram?: boolean;
  };
}

export async function notify({ title, body, channels }: NotifyOptions) {
  const use = {
    web: channels?.web ?? false,
    push: channels?.push ?? false,
    email: channels?.email ?? false,
    telegram: channels?.telegram ?? false,
  };

  try {
    if (use.web) sendBrowserNotification(title, body);
    if (use.push) await sendPushNotification(title, body);
    if (use.email) await sendEmail(title, body);
    if (use.telegram)
      await sendTelegram(`*${title}*\n${body}`);
  } catch (err) {
    console.error("Notify error:", err);
  }
}
