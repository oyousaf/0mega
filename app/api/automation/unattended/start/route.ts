import { NextResponse } from "next/server";
import { enableAutomation } from "@/lib/trading/automation/automationState";

/* ---------------------------------------
ENABLE AUTOMATION
---------------------------------------- */

async function run() {
  await enableAutomation();

  console.log("[AUTOMATION_ENABLED]");

  return NextResponse.json({
    ok: true,
    automation: "enabled",
    engine: "OMEGA-30",
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
