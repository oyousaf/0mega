export type OrderSide = "buy" | "sell";

export async function executeStockOrder(
  symbol: string,
  quantity: number,
  side: OrderSide
): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
}> {
  // TEMP STUB: No live trading yet
  return {
    success: false,
    message: "Execution not implemented yet (stub).",
  };
}
