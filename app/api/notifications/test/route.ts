import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/notify/email";
import { sendPushNotification } from "@/lib/notify/push";
import { sendTelegram } from "@/lib/notify/telegram";

type Channel = "push" | "email" | "telegram" | "all";

export async function POST(req: Request) {
  const { channel } = (await req.json()) as { channel?: unknown };
  if (!(["push", "email", "telegram", "all"] as const).includes(channel as Channel)) {
    return NextResponse.json({ error: "invalid_channel" }, { status: 400 });
  }

  const tasks: Promise<unknown>[] = [];
  if (channel === "push" || channel === "all") {
    tasks.push(sendPushNotification("Omega notification test", "Push is working."));
  }
  if (channel === "email" || channel === "all") {
    tasks.push(sendEmail("Omega notification test", "Email is working."));
  }
  if (channel === "telegram" || channel === "all") {
    tasks.push(sendTelegram("Omega notification test: Telegram is working."));
  }

  await Promise.all(tasks);
  return NextResponse.json({ ok: true });
}
