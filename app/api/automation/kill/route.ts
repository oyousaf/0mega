import { NextResponse } from "next/server";
import { disableAutomation } from "@/lib/trading/automation/automationState";

export async function POST() {
  disableAutomation();
  return NextResponse.json({ success: true });
}
