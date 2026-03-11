import { NextResponse } from "next/server";
import { runPriceTick } from "@/lib/engine/priceLoop";

/* ---------------------------------------
ENGINE TICK
---------------------------------------- */

export async function GET() {
  try {
    const result = await runPriceTick();

    return NextResponse.json({
      ok: true,
      engine: "OMEGA-30",
      mode: "paper",
      result,
    });
  } catch (err: any) {
    console.error("[ENGINE_TICK_ERROR]", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "UNKNOWN_ENGINE_ERROR",
      },
      { status: 500 },
    );
  }
}
