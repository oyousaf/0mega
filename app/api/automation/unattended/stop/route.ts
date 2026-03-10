import { NextResponse } from "next/server";
import { stopPriceLoop } from "@/lib/engine/priceLoop";
import { disableAutomation } from "@/lib/trading/automation/automationState";

async function run() {
  await disableAutomation();

  stopPriceLoop();

  return NextResponse.json({
    ok: true,
    engine: "OMEGA-30",
    automation: "disabled",
    status: "stopped",
  });
}

/* Cron trigger */
export async function GET() {
  return run();
}

/* Manual trigger */
export async function POST() {
  return run();
}
