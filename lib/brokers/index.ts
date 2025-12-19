import { BrokerRouter } from "./router";
import { PaperBrokerAdapter } from "./adapters/paper.adapter";

export const brokerRouter = new BrokerRouter({
  crypto: [new PaperBrokerAdapter("crypto")],
  equity: [new PaperBrokerAdapter("equity")],
  forex: [new PaperBrokerAdapter("forex")],
});
