import { NextResponse } from "next/server";
import { startPriceLoop } from "@/lib/engine/priceLoop";

/* ---------------------------------------
START ENGINE
---------------------------------------- */

export async function GET() {
  try {
    await startPriceLoop();

    return NextResponse.json({
      ok: true,
      engine: "OMEGA-30",
      status: "started",
    });
  } catch (err: any) {
    console.error("[ENGINE_START_ERROR]", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "ENGINE_START_FAILED",
      },
      { status: 500 },
    );
  }
}
