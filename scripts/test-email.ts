import "dotenv/config";
import { sendEmail } from "@/lib/notify/email";

async function main() {
  console.log("📧 Testing EMAIL notification...");

  await sendEmail(
    "Omega Email Test",
    "Your Omega email notification is working."
  );

  console.log("✅ Email test completed.");
}

main().catch((err) => console.error(err));
