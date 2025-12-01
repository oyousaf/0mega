import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const pair = symbol.toUpperCase();

  const cacheKey = `crypto_${pair}`;

  // 1. Attempt to serve from cache
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`;

    const res = await fetch(url, { method: "GET", cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Binance API error: ${res.status}`);
    }

    const data = await res.json();

    const result = {
      source: "binance_spot",
      symbol: data.symbol,
      price: Number(data.price),
      halaal: true,
      cached: false,
    };

    // 2. Cache result for 2 seconds
    setCached(cacheKey, result, 2000);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
