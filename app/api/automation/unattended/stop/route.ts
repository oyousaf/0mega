import { NextResponse } from "next/server";
import { stopPriceLoop } from "@/lib/engine/priceLoop";

export async function POST() {
  stopPriceLoop();

  return NextResponse.json({
    ok: true,
    engine: "OMEGA-27",
    stopped: true,
  });
}
