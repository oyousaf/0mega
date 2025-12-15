import { NextResponse } from "next/server";
import { runAutomationTick } from "@/lib/trading/automation/runAutomationTick";

/**
 * TEMP: Manual automation trigger
 * Sprint 16 / early Sprint 17
 *
 * GET /api/automation/tick
 */

export async function GET() {
  try {
    await runAutomationTick();

    return NextResponse.json({
      success: true,
      message: "Automation tick executed",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Automation tick failed:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
