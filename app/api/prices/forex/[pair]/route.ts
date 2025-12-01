import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params;
  const encodedPair = encodeURIComponent(pair);

  const cacheKey = `forex_${pair}`;

  // 1. Serve cached result if available
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodedPair}&apikey=${process.env.TWELVE_DATA_API_KEY}`;

    const res = await fetch(url, { method: "GET", cache: "no-store" });

    if (!res.ok) {
      throw new Error(`TwelveData API error: ${res.status}`);
    }

    const data = await res.json();

    const result = {
      source: "twelvedata_spot",
      pair,
      price: Number(data.price),
      halaal: true,
      cached: false,
    };

    // 2. Cache for 2 seconds
    setCached(cacheKey, result, 2000);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
