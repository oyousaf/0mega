import { BrokerRouter } from "./router";
import { PaperBrokerAdapter } from "./adapters/paper.adapter";
import { BinanceAdapter } from "./adapters/binance.adapter";

export const brokerRouter = new BrokerRouter({
  crypto: [
    new BinanceAdapter(),
    new PaperBrokerAdapter("crypto"), 
  ],
  equity: [new PaperBrokerAdapter("equity")],
  forex: [new PaperBrokerAdapter("forex")],
});
