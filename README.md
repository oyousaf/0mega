## 𝛀mega

Escaping the Matrix — one trade at a time.

Omega is a halaal-first automated trading platform built around **execution truth**, not signals.  
The system is designed to progress from manual analysis to fully autonomous trading while remaining safe, auditable, and compliant at every stage.

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

### Trading Architecture
- Broker-agnostic execution layer
- Execution-first data model
- Automation engine with safety guards
- Paper trading broker (current)

---

## What Exists Today

### Execution-First Trading Engine
- Trades and executions are the source of truth.
- No dependency on stored signals.
- All analytics derived from executions only.

### Paper Trading System
- Paper broker implementation.
- Market orders.
- Partial closes.
- Full closes.
- Balance tracking.
- Execution logging.

### Automation Core
- Deterministic automation tick.
- Idempotent execution logic.
- Safe to run repeatedly.
- Manual trigger endpoint.

### Automation Status API
- Broker balance
- Open positions
- Trade count
- Execution count
- Last automation timestamp

### Analytics Dashboard
- Equity curve
- Win rate
- Profit factor
- Strategy performance
- Symbol performance
- Market breakdown (crypto / forex / stocks)
- Halaal compliance tracker

### UI System
- Omega-themed dashboard
- Modular analytics widgets
- Real-time polling
- Execution transparency

---

## What’s Left To Build

### Full Automation Loop
- Continuous automation scheduler
- Live price polling
- Automatic entry execution
- Automatic SL / TP handling
- Trade expiry enforcement

### Risk Engine
- Risk-based position sizing
- Max concurrent trades
- Max daily risk
- Loss freeze protection

### Safety Layer
- Halaal market validation
- Over-trading prevention
- Execution cooldowns
- Broker failover logic

### Broker Expansion
- Crypto exchange integration
- Forex broker integration
- Stock broker integration
- Unified execution router

### Strategy System
- Strategy definitions
- Backtesting engine
- Strategy performance attribution

---

## Design Principles

- Execution before signals
- Safety before speed
- Deterministic behaviour
- No hidden leverage
- No interest-based instruments
- Fully auditable state
- Halaal by design

---

## Disclaimer

Omega currently operates in **paper trading mode only**.  
Live trading is intentionally disabled until all safety, risk, and compliance layers are complete.
