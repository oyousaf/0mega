import { NextResponse } from "next/server";
import { runAutomationTick } from "@/lib/trading/automation/runAutomationTick";

export async function POST() {
  try {
    await runAutomationTick();

    return NextResponse.json({
      success: true,
      message: "Automation tick executed",
    });
  } catch (err: any) {
    console.error("Automation tick failed:", err);

    return NextResponse.json(
      { success: false, error: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
