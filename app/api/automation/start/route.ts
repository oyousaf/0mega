import { NextResponse } from "next/server";
import { enableAutomation } from "@/lib/trading/automation/automationState";

export async function POST() {
  enableAutomation();
  return NextResponse.json({ success: true });
}
