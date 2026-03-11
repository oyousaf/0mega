import { NextResponse } from "next/server";
import { disableAutomation } from "@/lib/trading/automation/automationState";

/* ---------------------------------------
DISABLE AUTOMATION
---------------------------------------- */

async function run() {
  await disableAutomation();

  console.log("[AUTOMATION_DISABLED]");

  return NextResponse.json({
    ok: true,
    automation: "disabled",
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
