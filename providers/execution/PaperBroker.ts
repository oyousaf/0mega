import type {
  Broker,
  ExecutionResult,
  OpenTrade,
  OrderSide,
} from "./broker.interface";
import { getPrice } from "@/providers";

let PAPER_BALANCE = 100_000;

const openTrades: OpenTrade[] = [];

function id() {
  return `paper-${Date.now()}-${Math.floor(Math.random() * 999999)}`;
}

export class PaperBroker implements Broker {
  async openTrade(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult> {
    const price = await getPrice(symbol, "crypto");
    const cost = price * qty;

    if (side === "BUY" && cost > PAPER_BALANCE) {
      return { success: false, message: "Insufficient paper balance" };
    }

    if (side === "BUY") PAPER_BALANCE -= cost;

    const tradeId = id();

    openTrades.push({
      id: tradeId,
      symbol,
      side,
      entryPrice: price,
      qty,
      openedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Trade opened",
      orderId: tradeId,
      filledPrice: price,
      qty,
    };
  }

  async partialClose(orderId: string, qty: number): Promise<ExecutionResult> {
    const t = openTrades.find((x) => x.id === orderId);
    if (!t) return { success: false, message: "Trade not found" };
    if (qty > t.qty)
      return { success: false, message: "Partial qty > open qty" };

    const price = await getPrice(t.symbol, "crypto");

    // Profit calculation
    let profit = 0;
    if (t.side === "BUY") profit = (price - t.entryPrice) * qty;
    else profit = (t.entryPrice - price) * qty;

    PAPER_BALANCE += profit;

    // Reduce the remaining size
    t.qty -= qty;

    return {
      success: true,
      message: "Partial close executed",
      orderId,
      filledPrice: price,
      qty,
    };
  }

  async closeTrade(orderId: string): Promise<ExecutionResult> {
    const idx = openTrades.findIndex((t) => t.id === orderId);
    if (idx === -1) return { success: false, message: "Trade not found" };

    const t = openTrades[idx];
    const price = await getPrice(t.symbol, "crypto");

    let profit = 0;
    if (t.side === "BUY") profit = (price - t.entryPrice) * t.qty;
    else profit = (t.entryPrice - price) * t.qty;

    PAPER_BALANCE += profit;
    openTrades.splice(idx, 1);

    return {
      success: true,
      message: "Trade closed",
      orderId,
      filledPrice: price,
      qty: t.qty,
    };
  }

  async getOpenTrades(): Promise<OpenTrade[]> {
    return [...openTrades];
  }

  async getBalance() {
    return PAPER_BALANCE;
  }
}
