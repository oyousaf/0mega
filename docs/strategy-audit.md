# Strategy and execution audit

## Current implementation

The active universe is deliberately limited to EURUSD. The engine runs on
completed five-minute candles during the London session, checks market
structure and EMA direction, and rejects stale data, weak volatility, narrow
ranges, abnormal short-term spikes, excessive spread, and configured
high-impact events. Position size risks 0.5% of current realised equity. Daily
loss, trade-count, cooldown, consecutive-loss, and single-open-position guards
remain enforced in the database-backed execution path.

Where the data provider supplies no executable bid and ask, spread is a
conservative model based on the symbol baseline, recent range and session. This
is more honest than treating candle close as a fill, but it is still an
estimate. Forward-test results must therefore be labelled as modelled paper
execution rather than broker-quality fills.

## Optimisation order

1. Start the fresh database and freeze parameters for a defined evaluation
   window. Store every rejected setup and its reason before tuning thresholds;
   otherwise there is no denominator for measuring filter value.
2. Record the spread estimate, market regime, session minute, signal geometry,
   maximum favourable excursion and maximum adverse excursion for every setup.
   Use these fields to find whether the spread and event controls improve
   expectancy after costs.
3. Compare candidates with anchored walk-forward validation. Select parameters
   on an earlier block, evaluate once on the next untouched block, then roll
   forward. Reject improvements that depend on a handful of trades or one
   central-bank week.
4. Tune one filter family at a time. Start with spread because it directly
   changes executable entry and risk distance, then event windows, then regime
   and structure thresholds. Keep risk per trade fixed during signal research.
5. Require positive expectancy in R, controlled drawdown and stable results
   across volatility buckets. Win rate alone is not a selection criterion.

## Event operations

`market_events` is intentionally explicit and auditable. The optional seed is
only a starting point; verify release times from the relevant central bank and
load the forthcoming calendar before enabling automation. A missed event is a
real operational failure, so the longer-term implementation should ingest an
authoritative calendar, alert when the calendar is stale, and fail closed for
an affected currency.

The September 2026 schedule is unusually concentrated for EURUSD: the ECB
decision is on 10 September and the FOMC decision is on 16 September. GBPUSD is
currently disabled, but the Bank of England decision on 17 September should be
added before that symbol is re-enabled.

## Evidence boundary

No historical Neon trades are carried over, and this repository has no
broker-grade quote history or untouched out-of-sample dataset. The changes
improve execution realism, observability and risk consistency; they do not
establish that the strategy is profitable. Do not loosen filters in response
to a quiet week or optimise against the first fresh sample.
