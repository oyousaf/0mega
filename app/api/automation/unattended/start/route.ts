import { NextResponse } from "next/server";
import { startPriceLoop } from "@/lib/engine/priceLoop";

export async function POST() {
  startPriceLoop();

  return NextResponse.json({
    ok: true,
    engine: "OMEGA-27",
    mode: "paper",
  });
}
