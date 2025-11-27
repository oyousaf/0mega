import Chance from "chance";
const chance = new Chance();

type MarketType = "stock" | "crypto" | "forex";

const STOCKS = ["AAPL", "TSLA", "NFLX", "GOOGL", "MSFT"];
const CRYPTO = ["BTC", "ETH", "ADA", "SOL", "XRP"];
const FOREX = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"];

/**
 * Generates realistic TP/SL levels around entry price.
 */
function generateLevels(entry: number) {
  const tp1 = Number(
    (entry * (1 + chance.floating({ min: 0.01, max: 0.02 }))).toFixed(4)
  );
  const tp2 = Number(
    (entry * (1 + chance.floating({ min: 0.025, max: 0.04 }))).toFixed(4)
  );
  const sl = Number(
    (entry * (1 - chance.floating({ min: 0.01, max: 0.02 }))).toFixed(4)
  );

  return { tp1, tp2, sl };
}

export function generateDummySignal(type: MarketType) {
  let symbol = "AAPL";

  if (type === "stock") symbol = chance.pickone(STOCKS);
  if (type === "crypto") symbol = chance.pickone(CRYPTO);
  if (type === "forex") symbol = chance.pickone(FOREX);

  const entry_price = Number(chance.floating({ min: 10, max: 5000, fixed: 4 }));

  const { tp1, tp2, sl } = generateLevels(entry_price);

  return {
    symbol,
    type,
    strategy: chance.pickone(["Breakout", "Pullback", "Scalp", "Swing"]),
    halaal: true,
    entry_price,
    tp1,
    tp2,
    sl,
    status: "ACTIVE",
    notes: chance.sentence({ words: chance.integer({ min: 4, max: 10 }) }),
    current_price: entry_price,
    processing: false,
  };
}
