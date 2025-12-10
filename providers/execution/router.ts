import { PaperBroker } from "./PaperBroker";
import type { Broker } from "./broker.interface";

const paper = new PaperBroker();

export function getBroker(): Broker {
  return paper;
}
