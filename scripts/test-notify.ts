import "dotenv/config";
import { notify } from "@/lib/notify/index";

async function main() {
  console.log("🧪 Testing FULL notify() pipeline...");

  await notify({
    title: "Omega Full Pipeline Test",
    body: "Testing: Web + Push + Email + Telegram",
  });

  console.log("✅ Full notify() test completed.");
}

main().catch((err) => console.error(err));
