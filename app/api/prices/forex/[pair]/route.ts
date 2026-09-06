import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

type ForexPriceResponse = {
  price?: unknown;
  rates?: Record<string, unknown>;
};

const safe = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);

function normalise(raw: string) {
  const p = raw.toUpperCase().trim();
  if (p.includes("/")) return p;
  if (p.length === 6) return `${p.slice(0, 3)}/${p.slice(3)}`;
  return p;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params;
  const normal = normalise(pair);
  const [base, quote] = normal.split("/");
  const cacheKey = `forex_${normal}`;

  // CACHE
  const cached = getCached<Record<string, unknown>>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true });

  // 1. Frankfurter
  try {
    const url = `https://api.frankfurter.app/latest?from=${base}&to=${quote}`;
    const res = await fetch(url, { cache: "no-store" });

    if (res.ok) {
      const j = (await res.json()) as ForexPriceResponse;
      const px = safe(j.rates?.[quote]);

      if (px) {
        const result = {
          source: "frankfurter_spot",
          pair: normal,
          price: px,
          halaal: true,
          cached: false,
        };

        setCached(cacheKey, result, 60000);
        return NextResponse.json(result);
      }
    }
  } catch {}

  // 2. TwelveData fallback
  try {
    const tUrl = `https://api.twelvedata.com/price?symbol=${normal}&apikey=${process.env.TWELVE_DATA_API_KEY}`;
    const res = await fetch(tUrl, { cache: "no-store" });

    if (res.ok) {
      const j = (await res.json()) as ForexPriceResponse;
      const px = safe(j.price);

      if (px) {
        const result = {
          source: "twelvedata_spot",
          pair: normal,
          price: px,
          halaal: true,
          cached: false,
        };

        setCached(cacheKey, result, 2000);
        return NextResponse.json(result);
      }
    }
  } catch {}

  // Never turn a provider failure into a fabricated market price.
  return NextResponse.json(
    {
      source: "forex_fallback",
      pair: normal,
      halaal: true,
      error: "price_unavailable",
    },
    { status: 503 }
  );
}
