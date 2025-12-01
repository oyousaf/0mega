import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

function normalizePair(raw: string): string {
  const p = raw.toUpperCase();

  // Already in correct form (EUR/USD)
  if (p.includes("/")) return p;

  // Convert EURUSD → EUR/USD
  if (p.length === 6) {
    return `${p.slice(0, 3)}/${p.slice(3)}`;
  }

  // Last resort: return original
  return p;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params;

  const normalized = normalizePair(pair);
  const encodedPair = encodeURIComponent(normalized);

  const cacheKey = `forex_${normalized}`;

  // 1. Cached?
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodedPair}&apikey=${process.env.TWELVE_DATA_API_KEY}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`TwelveData API error: ${res.status}`);

    const data = await res.json();

    const result = {
      source: "twelvedata_spot",
      pair: normalized,
      price: data?.price ? Number(data.price) : null,
      halaal: true,
      cached: false,
    };

    setCached(cacheKey, result, 2000);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
