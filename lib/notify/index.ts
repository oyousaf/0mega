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
  const isNode = typeof window === "undefined";

  const use = {
    web: channels?.web ?? (isNode ? false : true),
    push: channels?.push ?? true,
    email: channels?.email ?? true,
    telegram: channels?.telegram ?? true,
  };

  try {
    if (use.web) {
      const { sendBrowserNotification } = await import("./browser");
      sendBrowserNotification(title, body);
    }

    if (use.push) {
      const { sendPushNotification } = await import("./push");
      await sendPushNotification(title, body);
    }

    if (use.email) {
      const { sendEmail } = await import("./email");
      await sendEmail(title, body);
    }

    if (use.telegram) {
      const { sendTelegram } = await import("./telegram");
      await sendTelegram(`*${title}*\n${body}`);
    }

  } catch (err) {
    console.error("Notify error:", err);
  }
}
