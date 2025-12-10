function normalizeBinanceSymbol(raw: string): string {
  if (!raw) return "";

  const s = raw.toUpperCase().trim();

  // Already OK: BTCUSDT, ETHUSDT, SOLUSDT...
  if (s.endsWith("USDT")) return s;

  // Auto-complete base assets → BTC → BTCUSDT
  if (s.length <= 5) return `${s}USDT`;

  return s;
}

export async function getCryptoPrice(symbol: string): Promise<number> {
  const normalized = normalizeBinanceSymbol(symbol);

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/prices/crypto/${normalized}`;

  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) throw new Error(`Failed to fetch crypto price for ${normalized}`);

  const data = await res.json();

  if (data?.price == null || Number.isNaN(Number(data.price))) {
    throw new Error(`No valid price returned for ${normalized}`);
  }

  return Number(data.price);
}
