import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:o_yousaf@live.co.uk",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPush(sub: any, title: string, body: string) {
  try {
    await webpush.sendNotification(
      sub,
      JSON.stringify({ title, body })
    );
  } catch (err) {
    console.error("Push error:", err);
  }
}
