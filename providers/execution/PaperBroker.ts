import type {
  Broker,
  ExecutionResult,
  OpenTrade,
  OrderSide,
} from "./broker.interface";
import { getPrice } from "@/providers/index";

let PAPER_BALANCE = 100_000;

//
// In-memory storage of open trades
// Each trade is independent with its own orderId
//
const openTrades: OpenTrade[] = [];

function generateId() {
  return `paper-${Date.now()}-${Math.floor(Math.random() * 999999)}`;
}

export class PaperBroker implements Broker {
  //
  // OPEN TRADE (BUY or SELL)
  //
  async openTrade(
    symbol: string,
    qty: number,
    side: OrderSide
  ): Promise<ExecutionResult> {
    const price = await getPrice(symbol, "crypto");
    const cost = price * qty;

    if (side === "BUY") {
      // Need enough balance
      if (cost > PAPER_BALANCE) {
        return { success: false, message: "Insufficient paper balance" };
      }
      PAPER_BALANCE -= cost;
    } else {
      // SELL trade (short)
      // No balance condition for synthetics unless you want margin rules
    }

    const id = generateId();

    openTrades.push({
      id,
      symbol,
      side,
      entryPrice: price,
      qty,
      openedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `${side} trade opened`,
      orderId: id,
      filledPrice: price,
      qty,
    };
  }

  //
  // CLOSE TRADE
  //
  async closeTrade(orderId: string): Promise<ExecutionResult> {
    const idx = openTrades.findIndex((t) => t.id === orderId);
    if (idx === -1) {
      return { success: false, message: "Trade not found" };
    }

    const trade = openTrades[idx];
    const price = await getPrice(trade.symbol, "crypto");

    // Profit calculation
    let profit = 0;

    if (trade.side === "BUY") {
      profit = (price - trade.entryPrice) * trade.qty;
    } else {
      profit = (trade.entryPrice - price) * trade.qty;
    }

    PAPER_BALANCE += profit;

    // Remove from open trades
    openTrades.splice(idx, 1);

    return {
      success: true,
      message: "Trade closed",
      orderId,
      filledPrice: price,
      qty: trade.qty,
    };
  }

  //
  // GET ALL OPEN TRADES
  //
  async getOpenTrades(): Promise<OpenTrade[]> {
    return [...openTrades];
  }

  //
  // BALANCE
  //
  async getBalance(): Promise<number> {
    return PAPER_BALANCE;
  }
}
