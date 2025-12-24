import { NextResponse, NextRequest } from "next/server";
import { getCached, setCached } from "@/lib/rateLimitCache";

const safe = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : null);

function normalise(raw: string) {
  const p = raw.toUpperCase().trim();
  if (p.includes("/")) return p;
  if (p.length === 6) return `${p.slice(0, 3)}/${p.slice(3)}`;
  throw new Error(`Invalid forex pair: ${raw}`);
}

function assertMarketOpen() {
  const day = new Date().getUTCDay();
  if (day === 0 || day === 6) {
    throw new Error("FOREX_MARKET_CLOSED");
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: { pair: string } }
) {
  try {
    assertMarketOpen();

    const normal = normalise(context.params.pair);
    const [base, quote] = normal.split("/");
    const cacheKey = `forex_${normal}`;

    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // 1. Frankfurter
    try {
      const url = `https://api.frankfurter.app/latest?from=${base}&to=${quote}`;
      const res = await fetch(url, { cache: "no-store" });

      if (res.ok) {
        const j = await res.json();
        const px = safe(j?.rates?.[quote]);

        if (px) {
          const result = {
            source: "frankfurter_spot",
            pair: normal,
            price: px,
            halaal: true,
          };

          setCached(cacheKey, result, 60_000);
          return NextResponse.json(result);
        }
      }
    } catch {}

    // 2. TwelveData fallback
    try {
      const tUrl = `https://api.twelvedata.com/price?symbol=${normal}&apikey=${process.env.TWELVE_DATA_API_KEY}`;
      const res = await fetch(tUrl, { cache: "no-store" });

      if (res.ok) {
        const j = await res.json();
        const px = safe(j?.price);

        if (px) {
          const result = {
            source: "twelvedata_spot",
            pair: normal,
            price: px,
            halaal: true,
          };

          setCached(cacheKey, result, 5_000);
          return NextResponse.json(result);
        }
      }
    } catch {}

    return NextResponse.json(
      { error: "NO_FOREX_PRICE" },
      { status: 503 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 400 }
    );
  }
}
