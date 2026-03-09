import { NextResponse } from "next/server";
import { startPriceLoop } from "@/lib/engine/priceLoop";

function run() {
  startPriceLoop();

  return NextResponse.json({
    ok: true,
    engine: "OMEGA-30",
    mode: "paper",
    status: "started",
  });
}

/* Cron trigger */
export async function GET() {
  return run();
}

/* Manual trigger (Postman / curl) */
export async function POST() {
  return run();
}
