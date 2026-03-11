import { NextResponse } from "next/server";
import { startPriceLoop } from "@/lib/engine/priceLoop";
import { enableAutomation } from "@/lib/trading/automation/automationState";

async function run() {
  await enableAutomation();

  startPriceLoop();

  return NextResponse.json({
    ok: true,
    engine: "OMEGA-30",
    mode: "paper",
    automation: "enabled",
    status: "started",
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
