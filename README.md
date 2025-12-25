# 𝛀mega

Escaping the Matrix — one trade at a time.

Omega is a **halaal-first automated trading system** built around
**execution truth**, not signal hype.

This is a personal system designed for **correctness, safety, and auditability**
before speed, scale, or automation.

---

## Core Philosophy

- Execution before signals
- Safety before speed
- Deterministic behaviour
- No hidden leverage
- No interest-based instruments
- Fully auditable state
- Halaal by design

---

## Technology Stack

### Frontend

- React 19
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- MUI
- Framer Motion
- Recharts

### Backend

- Next.js API routes
- Neon (Postgres)
- Server Actions
- Typed execution engine

---

## Trading Architecture

- Broker-agnostic execution layer
- Execution-first data model
- Deterministic automation engine
- Paper trading broker (current)
- Risk and safety enforced at engine level

---

## What Exists Today

### Execution Engine

- Trades and executions are the source of truth
- Deterministic execution logic
- Partial closes, full closes, SL / TP handling
- Realistic execution modelling:
  - Spread curves
  - Slippage
  - Fees
- Daily loss guard and trade freeze
- Risk-based position sizing

### Backtesting System

- Same engine for backtest and live
- Candle replay
- Deterministic results
- Equity curve and drawdown metrics
- Execution realism parity diagnostics

### Automation Core

- Idempotent engine ticks
- Safe to run repeatedly
- Manual trigger endpoints
- Backtest and live symmetry

### Analytics Dashboard

- Equity curve
- Win rate
- Profit factor
- Strategy performance
- Symbol performance
- Market breakdown (crypto / forex / equities)
- Halaal compliance tracking

### UI

- Omega-themed dashboard
- Modular analytics widgets
- Execution transparency
- Real-time polling

---

## Current Mode

Omega currently runs in **paper trading mode only**.

There is **no live trading** enabled by design.

---

## What’s Next

### Planned (Personal Use)

- Continuous automation loop (local)
- Automatic entry scanning
- Automatic SL / TP enforcement
- Trade expiry handling
- Daily performance snapshot view

### Optional (Future)

- Live broker integrations
- Mobile notifications
- Strategy editor / AI strategies
- Cloud deployment

---

## Disclaimer

Omega is a **personal research and trading system**.

It is not financial advice.
It is not a product.
Live trading is intentionally disabled until all safety,
risk, and compliance layers are fully verified.
