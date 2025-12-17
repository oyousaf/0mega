import { NextResponse } from "next/server";
import { stopUnattended } from "@/lib/trading/automation/scheduler";

export async function POST() {
  stopUnattended();
  return NextResponse.json({ success: true });
}
