import "dotenv/config";
import { sendPushNotification } from "@/lib/notify/push";

async function main() {
  console.log("🔔 Testing PUSH notification...");

  await sendPushNotification(
    "Omega Push Test",
    "This is a server-triggered push notification."
  );

  console.log("✅ Push test script completed.");
}

main().catch((err) => console.error(err));
