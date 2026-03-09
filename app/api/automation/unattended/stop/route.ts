import { NextResponse } from "next/server";
import { stopPriceLoop } from "@/lib/engine/priceLoop";

function run() {
  stopPriceLoop();

  return NextResponse.json({
    ok: true,
    engine: "OMEGA-30",
    status: "stopped",
  });
}

/* Cron trigger */
export async function GET() {
  return run();
}

/* Manual trigger */
export async function POST() {
  return run();
}
