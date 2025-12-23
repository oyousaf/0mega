import {
  BrokerAdapter,
  Market,
  PlaceOrderParams,
  NormalisedBalance,
  NormalisedPosition,
} from "@/lib/brokers/types";
import { isUsMarketOpen } from "@/lib/market/usMarketHours";

/* -------------------------------------------------
   ENV
-------------------------------------------------- */
const ALPACA_KEY = process.env.ALPACA_API_KEY!;
const ALPACA_SECRET = process.env.ALPACA_API_SECRET!;
const ALPACA_PAPER = process.env.ALPACA_PAPER === "true";

const BASE_URL = ALPACA_PAPER
  ? "https://paper-api.alpaca.markets"
  : "https://api.alpaca.markets";

if (!ALPACA_KEY || !ALPACA_SECRET) {
  throw new Error("ALPACA_API_KEYS_MISSING");
}

/* -------------------------------------------------
   ALPACA ADAPTER (SPOT EQUITIES ONLY)
-------------------------------------------------- */
export class AlpacaAdapter implements BrokerAdapter {
  name = "alpaca";
  market: Market = "equity";

  async connect() {
    return;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/v2/account`, {
        headers: this.headers(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /* ----------------------------
     BALANCE
  ---------------------------- */
  async fetchBalance(): Promise<NormalisedBalance[]> {
    const res = await fetch(`${BASE_URL}/v2/account`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new Error("ALPACA_ACCOUNT_FAILED");
    }

    const a = await res.json();
    const cash = Number(a.cash);
    const equity = Number(a.equity);

    return [
      {
        currency: "USD",
        free: cash,
        used: equity - cash,
        total: equity,
      },
    ];
  }

  /* ----------------------------
     POSITIONS
  ---------------------------- */
  async fetchPositions(): Promise<NormalisedPosition[]> {
    const res = await fetch(`${BASE_URL}/v2/positions`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new Error("ALPACA_POSITIONS_FAILED");
    }

    const data = await res.json();

    return data.map((p: any) => ({
      symbol: p.symbol,
      qty: Number(p.qty),
      entryPrice: Number(p.avg_entry_price),
      unrealisedPnl: Number(p.unrealized_pl),
    }));
  }

  /* ----------------------------
     PLACE ORDER
     - Spot only
     - No shorts
     - Market hours enforced
  ---------------------------- */
  async placeOrder(params: PlaceOrderParams): Promise<{ orderId: string }> {
    if (!isUsMarketOpen()) {
      throw new Error("US_MARKET_CLOSED");
    }

    if (params.side === "SELL") {
      throw new Error("ALPACA_SHORTING_NOT_ALLOWED");
    }

    const res = await fetch(`${BASE_URL}/v2/orders`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        symbol: params.symbol,
        qty: params.qty,
        side: params.side.toLowerCase(),
        type: "market",
        time_in_force: "day",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ALPACA_ORDER_FAILED:${text}`);
    }

    const o = await res.json();
    return { orderId: o.id };
  }

  /* ----------------------------
     CANCEL ORDER
  ---------------------------- */
  async cancelOrder(orderId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/v2/orders/${orderId}`, {
      method: "DELETE",
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new Error("ALPACA_CANCEL_FAILED");
    }
  }

  /* ----------------------------
     HEADERS
  ---------------------------- */
  private headers() {
    return {
      "APCA-API-KEY-ID": ALPACA_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET,
      "Content-Type": "application/json",
    };
  }
}
