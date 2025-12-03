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
    // Web = client-side only
    if (use.web) {
      const { sendBrowserNotification } = await import("./browser");
      sendBrowserNotification(title, body);
    }

    // Push = server-only
    if (use.push) {
      const { sendPushNotification } = await import("./push");
      await sendPushNotification(title, body);
    }

    // Email = server-only
    if (use.email) {
      const { sendEmail } = await import("./email");
      await sendEmail(title, body);
    }

    // Telegram = server-only
    if (use.telegram) {
      const { sendTelegram } = await import("./telegram");
      await sendTelegram(`*${title}*\n${body}`);
    }
  } catch (err) {
    console.error("Notify error:", err);
  }
}
