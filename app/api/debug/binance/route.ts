import { NextResponse } from "next/server";
import { brokerRouter } from "@/lib/brokers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("DEBUG: starting Binance balance check");

    const balance = await brokerRouter.fetchBalance("crypto");

    console.log("DEBUG: Binance balance success", balance);

    return NextResponse.json({
      ok: true,
      broker: "binance",
      balance,
    });
  } catch (err: any) {
    console.error("BINANCE DEBUG ERROR RAW:", err);

    return NextResponse.json(
      {
        ok: false,
        broker: "binance",
        error: err?.message ?? "UNKNOWN_ERROR",
        name: err?.name,
        stack: err?.stack,
      },
      { status: 500 }
    );
  }
}
