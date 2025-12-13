import { NextResponse } from "next/server";
import { getBroker } from "@/providers/execution/router";

/* ---------------------------------------------
   OPEN POSITIONS (BROKER TRUTH)
--------------------------------------------- */
export async function GET() {
  try {
    const broker = getBroker();

    const [positions, balance] = await Promise.all([
      broker.fetchPositions(),
      broker.fetchBalance(),
    ]);

    return NextResponse.json({
      success: true,
      balance,
      positions,
    });
  } catch (err: any) {
    console.error("Open positions API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
