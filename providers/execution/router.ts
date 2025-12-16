import type { Broker } from "./broker.interface";
import { PaperBroker } from "./PaperBroker";

/**
 * SINGLE ENTRY POINT
 * Future brokers plug in here.
 */
const paper = new PaperBroker();

/**
 * Market-aware routing
 * Extend without touching callers.
 */
export function getBroker(): Broker {
  // Later:
  // if (market === "crypto") return binance;
  // if (market === "forex") return oanda;
  // if (market === "stock") return alpaca;

  return paper;
}
