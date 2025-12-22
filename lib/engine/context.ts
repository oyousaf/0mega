export type EngineMode = "LIVE" | "BACKTEST";

let mode: EngineMode = "LIVE";
let nowFn: () => number = () => Date.now();

export function setBacktestTime(t: number) {
  mode = "BACKTEST";
  nowFn = () => t;
}

export function setLiveTime() {
  mode = "LIVE";
  nowFn = () => Date.now();
}

export function engineNow() {
  return nowFn();
}

export function engineMode() {
  return mode;
}
