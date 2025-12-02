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

export async function notify(opts: NotifyOptions) {
  const { title, body } = opts;

  const enabled = {
    web: opts.channels?.web ?? true,
    push: opts.channels?.push ?? true,
    email: opts.channels?.email ?? true,
    telegram: opts.channels?.telegram ?? true,
  };

  try {
    if (enabled.web) sendBrowserNotification(title, body);
    if (enabled.push) await sendPushNotification(title, body);
    if (enabled.email) await sendEmail(title, body);
    if (enabled.telegram) await sendTelegram(`*${title}*\n${body}`);
  } catch (err) {
    console.error("Notify failed:", err);
  }
}
