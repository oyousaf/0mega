import { BrokerAdapter, Market } from "@/lib/brokers/types";
import { PaperBrokerAdapter } from "./paper.adapter";

export function createForexAdapter(): BrokerAdapter {
  return new PaperBrokerAdapter("forex");
}
