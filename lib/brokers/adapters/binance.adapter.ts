import crypto from "crypto";

import { BrokerAdapter, Market, PlaceOrderParams } from "@/lib/brokers/types";

/* -------------------------------------------------
   ENV + MODE
-------------------------------------------------- */
const IS_TESTNET: boolean = process.env.BINANCE_TESTNET === "true";

const API_KEY = IS_TESTNET
  ? process.env.BINANCE_TESTNET_API_KEY
  : process.env.BINANCE_LIVE_API_KEY;

const API_SECRET = IS_TESTNET
  ? process.env.BINANCE_TESTNET_API_SECRET
  : process.env.BINANCE_LIVE_API_SECRET;

if (!API_KEY || !API_SECRET) {
  throw new Error("BINANCE_API_KEYS_MISSING");
}

/* TS GUARANTEE AFTER RUNTIME CHECK */
const BINANCE_KEY: string = API_KEY;
const BINANCE_SECRET: string = API_SECRET;

const BASE_URL = IS_TESTNET
  ? "https://testnet.binance.vision"
  : "https://api.binance.com";

/* -------------------------------------------------
   BINANCE ADAPTER (SPOT ONLY)
-------------------------------------------------- */
export class BinanceAdapter implements BrokerAdapter {
  name = "binance";
  market: Market = "crypto";

  private apiKey = BINANCE_KEY;
  private apiSecret = BINANCE_SECRET;

  async connect() {
    return;
  }

  async healthCheck() {
    try {
      const res = await fetch(`${BASE_URL}/api/v3/ping`);
      return res.ok;
    } catch {
      return false;
    }
  }

  /* ----------------------------
     BALANCE
  ---------------------------- */
  async fetchBalance() {
    const data = await this.signedGet("/api/v3/account");

    return data.balances
      .filter((b: any) => Number(b.free) || Number(b.locked))
      .map((b: any) => ({
        currency: b.asset,
        free: Number(b.free),
        used: Number(b.locked),
        total: Number(b.free) + Number(b.locked),
      }));
  }

  /* ----------------------------
     POSITIONS (SPOT ONLY)
  ---------------------------- */
  async fetchPositions() {
    return [];
  }

  /* ----------------------------
     PLACE ORDER
     (BLOCKED ON TESTNET)
  ---------------------------- */
  async placeOrder(params: PlaceOrderParams) {
    if (IS_TESTNET) {
      throw new Error("BINANCE_ORDER_BLOCKED_TESTNET");
    }

    const body = {
      symbol: params.symbol.replace("-", ""),
      side: params.side,
      type: "MARKET",
      quantity: params.qty,
    };

    const res = await this.signedPost("/api/v3/order", body);

    if (!res.orderId) {
      throw new Error("BINANCE_ORDER_FAILED");
    }

    return { orderId: String(res.orderId) };
  }

  async cancelOrder(orderId: string) {
    throw new Error("BINANCE_CANCEL_NOT_IMPLEMENTED");
  }

  /* -------------------------------------------------
     INTERNAL HELPERS
  -------------------------------------------------- */
  private async signedGet(path: string) {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}`;
    const signature = this.sign(query);

    const res = await fetch(
      `${BASE_URL}${path}?${query}&signature=${signature}`,
      {
        headers: { "X-MBX-APIKEY": this.apiKey },
      }
    );

    if (!res.ok) {
      throw new Error("BINANCE_GET_FAILED");
    }

    return res.json();
  }

  private async signedPost(path: string, body: Record<string, any>) {
    const timestamp = Date.now();
    const query = new URLSearchParams({
      ...body,
      timestamp: String(timestamp),
    }).toString();

    const signature = this.sign(query);

    const res = await fetch(
      `${BASE_URL}${path}?${query}&signature=${signature}`,
      {
        method: "POST",
        headers: { "X-MBX-APIKEY": this.apiKey },
      }
    );

    if (!res.ok) {
      throw new Error("BINANCE_POST_FAILED");
    }

    return res.json();
  }

  private sign(payload: string) {
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(payload)
      .digest("hex");
  }
}
