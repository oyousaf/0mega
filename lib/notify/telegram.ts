"use server";

export async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.slice(0, 3800),
        parse_mode: "Markdown",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error("Telegram error:", err || res.statusText);
    }
  } catch (err) {
    console.error("Telegram send failed:", err);
  }
}
