export type OrderSide = "buy" | "sell";

export interface ExecutionResult {
  success: boolean;
  message: string;
  orderId?: string;
  filledPrice?: number;
  qty?: number;
}

export async function executeStockOrder(
  symbol: string,
  quantity: number,
  side: OrderSide
): Promise<ExecutionResult> {
  // --- LIVE TRADING DISABLED ---
  // Stub ensures engine calls succeed without breaking automation.

  return {
    success: false,
    message: "Live execution is not enabled. Using stub.",
    orderId: undefined,
    filledPrice: undefined,
    qty: quantity,
  };
}
