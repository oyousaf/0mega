import { NextResponse } from "next/server";
import { runControlledTick } from "@/lib/trading/automation/runControlledTick";

export async function GET() {
  try {
    const result = await runControlledTick();
    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
