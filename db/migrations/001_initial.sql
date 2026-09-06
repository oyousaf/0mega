CREATE TABLE automation_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO automation_state (id, enabled) VALUES (1, false);

CREATE TABLE paper_trades (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  signal_id text NOT NULL,
  symbol text NOT NULL CHECK (symbol ~ '^[A-Z0-9]{6,12}$'),
  side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
  strategy text NOT NULL DEFAULT 'MARKET_STRUCTURE',
  entry_price numeric(20, 10) NOT NULL CHECK (entry_price > 0),
  exit_price numeric(20, 10),
  qty numeric(20, 8) NOT NULL CHECK (qty > 0),
  sl numeric(20, 10) NOT NULL CHECK (sl > 0),
  tp1 numeric(20, 10) CHECK (tp1 > 0),
  rr numeric(12, 6) CHECK (rr > 0),
  risk_amount numeric(20, 8) NOT NULL CHECK (risk_amount >= 0),
  realised_pl numeric(20, 8),
  exit_reason text,
  is_closed boolean NOT NULL DEFAULT false,
  halaal boolean NOT NULL DEFAULT true,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CHECK (
    (
      is_closed = false
      AND closed_at IS NULL
      AND realised_pl IS NULL
      AND exit_price IS NULL
      AND exit_reason IS NULL
    )
    OR
    (
      is_closed = true
      AND closed_at IS NOT NULL
      AND realised_pl IS NOT NULL
      AND exit_price IS NOT NULL
      AND exit_reason IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX paper_trades_one_open_symbol
  ON paper_trades (symbol) WHERE is_closed = false;
CREATE INDEX paper_trades_closed_at ON paper_trades (closed_at DESC)
  WHERE is_closed = true;
CREATE INDEX paper_trades_opened_at ON paper_trades (opened_at DESC);

CREATE TABLE trade_executions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trade_id bigint NOT NULL REFERENCES paper_trades(id) ON DELETE RESTRICT,
  signal_id text,
  side text NOT NULL CHECK (side IN ('BUY', 'SELL')),
  qty numeric(20, 8) NOT NULL CHECK (qty > 0),
  price numeric(20, 10) NOT NULL CHECK (price > 0),
  broker text NOT NULL DEFAULT 'paper',
  order_id text,
  status text NOT NULL CHECK (status IN ('FILLED', 'FAILED')),
  risk_amount numeric(20, 8) NOT NULL CHECK (risk_amount >= 0),
  error text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trade_executions_trade_time
  ON trade_executions (trade_id, timestamp);

CREATE TABLE market_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  title text NOT NULL,
  impact text NOT NULL CHECK (impact IN ('HIGH', 'MEDIUM', 'LOW')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  source text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at >= starts_at)
);

CREATE INDEX market_events_active_window
  ON market_events (starts_at, ends_at) WHERE enabled = true;
CREATE UNIQUE INDEX market_events_identity
  ON market_events (currency, title, starts_at);

CREATE TABLE push_subs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sub jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX push_subs_endpoint
  ON push_subs ((sub->>'endpoint'));
