import { NextResponse } from "next/server";
import { runEngine } from "@/lib/engine/runEngine";

export async function POST() {
  await runEngine();
  return NextResponse.json({ success: true });
}
