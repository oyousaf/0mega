import { Trade } from "@/types/trade";

export const hasExecuted = (t: Trade) =>
  Array.isArray(t.executions) && t.executions.length > 0;

export const isClosedExecuted = (t: Trade) =>
  hasExecuted(t) && t.closed_at !== null;

export const isOpenExecuted = (t: Trade) =>
  hasExecuted(t) && t.closed_at === null;
