import { pool } from "@/lib/neon";
import { getBroker } from "@/providers/execution/router";
import type { OrderSide } from "@/providers/execution/broker.interface";
import { getSymbolConfig } from "@/lib/trading/config/symbolConfig";

/* -------------------------------------------------
TYPES
-------------------------------------------------- */

export type OpenResult =
  | {
      success: true;
      tradeId: number;
    }
  | {
      success: false;
      error: string;
    };

export type CloseResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

/* -------------------------------------------------
HELPERS
-------------------------------------------------- */

function reverseSide(side: OrderSide): OrderSide {
  return side === "BUY" ? "SELL" : "BUY";
}

function assertFinite(value: unknown, errorMessage: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(errorMessage);
  }

  return parsed;
}

function assertPositive(value: number, errorMessage: string): void {
  if (!(value > 0)) {
    throw new Error(errorMessage);
  }
}

function cleanZero(value: number): number {
  return Math.abs(value) < 0.0000001 ? 0 : value;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function validateLevelDistance(params: {
  entry: number;
  level: number;
  label: "SL" | "TP1";
}): void {
  const { entry, level, label } = params;

  assertPositive(entry, "ENTRY_NON_POSITIVE");
  assertPositive(level, `${label}_NON_POSITIVE`);

  const distance = Math.abs(entry - level);

  if (distance < entry * 0.00003) {
    throw new Error(`${label}_TOO_CLOSE`);
  }

  if (distance > entry * 0.5) {
    throw new Error(`${label}_TOO_FAR`);
  }
}

function validateTradeGeometry(params: {
  side: OrderSide;
  entry: number;
  sl: number;
  tp1: number | null;
}): void {
  const { side, entry, sl, tp1 } = params;

  const valid =
    side === "BUY"
      ? sl < entry && (tp1 === null || tp1 > entry)
      : sl > entry && (tp1 === null || tp1 < entry);

  if (!valid) {
    throw new Error(
      [
        "INVALID_GEOMETRY",
        `entry=${entry}`,
        `sl=${sl}`,
        `tp1=${tp1 ?? "null"}`,
        `side=${side}`,
      ].join(" "),
    );
  }
}

/* -------------------------------------------------
SYMBOL-AWARE RISK
-------------------------------------------------- */

function calculateRiskAmount(params: {
  symbol: string;
  entry: number;
  sl: number;
  qtyLots: number;
}): number {
  const config = getSymbolConfig(params.symbol);

  if (!config) {
    throw new Error(`UNSUPPORTED_SYMBOL ${params.symbol}`);
  }

  const stopPips = Math.abs(params.entry - params.sl) / config.pipSize;

  return cleanZero(stopPips * params.qtyLots * config.pipValuePerLot);
}

/* -------------------------------------------------
SYMBOL-AWARE PNL
-------------------------------------------------- */

function calculateRealisedPl(params: {
  symbol: string;
  side: OrderSide;
  entry: number;
  exit: number;
  qty: number;
}): number {
  const config = getSymbolConfig(params.symbol);

  if (!config) {
    throw new Error(`UNSUPPORTED_SYMBOL ${params.symbol}`);
  }

  const priceMove =
    params.side === "BUY"
      ? params.exit - params.entry
      : params.entry - params.exit;

  const pipMove = priceMove / config.pipSize;

  return cleanZero(pipMove * params.qty * config.pipValuePerLot);
}

/* -------------------------------------------------
OPEN TRADE
-------------------------------------------------- */

export async function executeTradeIntent(intent: {
  signalId: string;
  symbol: string;
  qty: number;
  side: OrderSide;
  rawSl: number;
  rawTp1?: number | null;
  entryPrice?: number;
}): Promise<OpenResult> {
  try {
    const symbolConfig = getSymbolConfig(intent.symbol);

    if (!symbolConfig) {
      return {
        success: false,
        error: `UNSUPPORTED_SYMBOL ${intent.symbol}`,
      };
    }

    const qty = assertFinite(intent.qty, "INVALID_QTY");

    if (!(qty > 0)) {
      return {
        success: false,
        error: "INVALID_QTY",
      };
    }

    const entry = assertFinite(intent.entryPrice, "INVALID_ENTRY");

    const sl = assertFinite(intent.rawSl, "INVALID_SL");

    const tp1 =
      intent.rawTp1 === null || intent.rawTp1 === undefined
        ? null
        : assertFinite(intent.rawTp1, "INVALID_TP");

    validateLevelDistance({
      entry,
      level: sl,
      label: "SL",
    });

    if (tp1 !== null) {
      validateLevelDistance({
        entry,
        level: tp1,
        label: "TP1",
      });
    }

    validateTradeGeometry({
      side: intent.side,
      entry,
      sl,
      tp1,
    });

    const broker = getBroker();

    const brokerResult = await broker.placeOrder(
      intent.symbol,
      qty,
      intent.side,
    );

    if (!brokerResult.success) {
      return {
        success: false,
        error: brokerResult.error ?? "ORDER_FAILED",
      };
    }

    const riskAmount = calculateRiskAmount({
      symbol: intent.symbol,
      entry,
      sl,
      qtyLots: qty,
    });

    const rr =
      tp1 === null ? null : Math.abs(tp1 - entry) / Math.abs(entry - sl);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `
        INSERT INTO paper_trades (
          signal_id,
          symbol,
          side,
          entry_price,
          qty,
          sl,
          tp1,
          rr,
          risk_amount,
          is_closed,
          realised_pl
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          false,
          NULL
        )
        RETURNING id
        `,
        [
          intent.signalId,
          intent.symbol,
          intent.side,
          entry,
          qty,
          sl,
          tp1,
          rr,
          riskAmount,
        ],
      );

      const tradeId = assertFinite(rows[0]?.id, "TRADE_ID_MISSING");

      await client.query(
        `
        INSERT INTO trade_executions (
          trade_id,
          side,
          qty,
          price,
          broker,
          order_id,
          status,
          risk_amount,
          error,
          timestamp
        )
        VALUES (
          $1,$2,$3,$4,
          'paper',
          $5,
          'FILLED',
          $6,
          NULL,
          NOW()
        )
        `,
        [
          tradeId,
          intent.side,
          qty,
          entry,
          brokerResult.orderId ?? null,
          riskAmount,
        ],
      );

      await client.query("COMMIT");

      return {
        success: true,
        tradeId,
      };
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: getErrorMessage(error, "OPEN_FAILED"),
    };
  }
}

/* -------------------------------------------------
CLOSE TRADE
-------------------------------------------------- */

export async function closeTrade(
  tradeId: number,
  reason: "SL_HIT" | "TP_HIT" | "MANUAL",
  exitPrice: number,
): Promise<CloseResult> {
  const client = await pool.connect();

  try {
    const id = assertFinite(tradeId, "INVALID_TRADE_ID");

    const exit = assertFinite(exitPrice, "INVALID_EXIT_PRICE");

    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      SELECT
        id,
        symbol,
        side,
        qty,
        entry_price,
        risk_amount
      FROM paper_trades
      WHERE id = $1
        AND is_closed = false
      FOR UPDATE
      `,
      [id],
    );

    if (!rows.length) {
      await client.query("ROLLBACK");

      return {
        success: false,
        error: "TRADE_ALREADY_CLOSED",
      };
    }

    const trade = rows[0];

    const symbol = String(trade.symbol);

    const side = String(trade.side) as OrderSide;

    const qty = assertFinite(trade.qty, "INVALID_QTY");

    const entry = assertFinite(trade.entry_price, "INVALID_ENTRY_PRICE");

    const realisedPl = calculateRealisedPl({
      symbol,
      side,
      entry,
      exit,
      qty,
    });

    const updateResult = await client.query(
      `
      UPDATE paper_trades
      SET
        is_closed = true,
        realised_pl = $1,
        exit_price = $2,
        exit_reason = $3,
        closed_at = NOW()
      WHERE id = $4
        AND is_closed = false
      `,
      [realisedPl, exit, reason, id],
    );

    if (updateResult.rowCount !== 1) {
      await client.query("ROLLBACK");

      return {
        success: false,
        error: "CLOSE_UPDATE_FAILED",
      };
    }

    await client.query(
      `
      INSERT INTO trade_executions (
        trade_id,
        signal_id,
        side,
        qty,
        price,
        broker,
        status,
        risk_amount,
        timestamp
      )
      VALUES (
        $1,
        NULL,
        $2,
        $3,
        $4,
        'paper',
        'FILLED',
        $5,
        NOW()
      )
      `,
      [id, reverseSide(side), qty, exit, trade.risk_amount],
    );

    await client.query("COMMIT");

    return {
      success: true,
    };
  } catch (error: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("[CLOSE_ROLLBACK_FAILED]", rollbackError);
    }

    return {
      success: false,
      error: getErrorMessage(error, "CLOSE_FAILED"),
    };
  } finally {
    client.release();
  }
}
