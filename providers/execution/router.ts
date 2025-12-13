import type { Broker } from "./broker.interface";
import { PaperBroker } from "./PaperBroker";
import { AlpacaBroker } from "./alpaca";

export function getBroker(): Broker {
  const mode = process.env.TRADING_MODE ?? "paper";

  if (mode === "live") {
    return new AlpacaBroker();
  }

  return new PaperBroker();
}
