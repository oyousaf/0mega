import { BrokerRouter } from "./router";
import { PaperBrokerAdapter } from "./adapters/paper.adapter";
import { BinanceAdapter } from "./adapters/binance.adapter";
import { AlpacaAdapter } from "./adapters/alpaca.adapter";

export const brokerRouter = new BrokerRouter({
  crypto: [new PaperBrokerAdapter("crypto"), new BinanceAdapter()],
  equity: [new PaperBrokerAdapter("equity"), new AlpacaAdapter()],
  forex: [new PaperBrokerAdapter("forex")],
});
