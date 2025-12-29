# 𝛀mega

Escaping the Matrix — one trade at a time.

Omega is a halaal-first automated trading system focused on execution truth, safety, and auditability over speed, scale, or optimisation.

This repository contains a personal research system. Live trading is intentionally disabled.

---

## Overview

Omega is designed around deterministic execution and strict risk control.  
Signals are inputs. Executions are the source of truth.

The system prioritises:

- Correctness over performance
- Safety over automation
- Transparency over abstraction
- Halaal compliance by design

---

## Features

- Deterministic execution engine
- Broker-agnostic architecture
- Paper trading broker
- Risk-based position sizing
- Daily loss and consecutive-loss guards
- SL / TP enforcement with partial and full closes
- Realistic execution modelling (spread, slippage, fees)
- Deterministic backtesting and forward testing
- Analytics and performance review dashboard
- Fully auditable trade and execution state

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
- Server Actions
- Neon (Postgres)
- Typed execution engine

---

## Architecture

- Execution-first data model
- Trades and executions as source of truth
- Idempotent engine ticks
- Backtest, forward, and live symmetry
- Risk and halaal rules enforced at engine level
- No hidden leverage or interest-based instruments

---

## Current Status

- Paper trading only
- Forward testing in progress
- Logic frozen during evaluation windows
- No live broker connectivity enabled

---

## Analytics

- Equity curve
- Drawdown tracking
- Win rate
- Profit factor
- Expectancy
- R-multiple distribution
- Daily PnL analysis
- Strategy and symbol breakdown
- Market breakdown (crypto / forex / equities)
- Halaal compliance tracking

Analytics are used for validation and decision-making, not optimisation.

---

## Roadmap (Personal Use)

- Continuous local automation loop
- Automatic entry scanning
- Trade expiry handling
- Daily performance snapshot
- Extended risk diagnostics

---

## Disclaimer

Omega is a personal research and trading system.

It is not financial advice.  
It is not a product.  
Live trading is disabled until all safety, risk, and halaal compliance layers are fully verified.
