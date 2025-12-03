import "dotenv/config";
import { sendTelegram } from "@/lib/notify/telegram";

async function main() {
  console.log("📨 Testing TELEGRAM notification...");

  await sendTelegram("*Omega Telegram Test*\nYour Telegram bot is working.");

  console.log("✅ Telegram test completed.");
}

main().catch((err) => console.error(err));
