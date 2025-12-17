import { NextResponse } from "next/server";
import { startUnattended } from "@/lib/trading/automation/scheduler";

export async function POST() {
  startUnattended();
  return NextResponse.json({ success: true });
}
