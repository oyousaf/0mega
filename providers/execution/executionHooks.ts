import type { ExecutionResult } from "@/providers/execution/broker.interface";

/**
 * Called after every broker execution.
 * Used later for:
 * - audit
 * - alerts
 * - failover
 */
export async function onExecution(
  result: ExecutionResult,
  context: {
    symbol: string;
    action: "OPEN" | "CLOSE" | "PARTIAL";
  },
) {
  if (!result.success) {
    console.warn("Execution failed", context, result.error);
    return;
  }

  // future: push → notifications, logs, analytics
}
