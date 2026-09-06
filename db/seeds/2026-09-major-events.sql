-- Review official release times before applying this optional seed.
INSERT INTO market_events (currency, title, impact, starts_at, ends_at, source)
VALUES
  (
    'EUR',
    'ECB monetary policy decision',
    'HIGH',
    '2026-09-10 12:00:00+00',
    '2026-09-10 13:15:00+00',
    'https://www.ecb.europa.eu/press/calendars/weekly/html/index.en.html'
  ),
  (
    'USD',
    'FOMC rate decision and press conference',
    'HIGH',
    '2026-09-16 17:45:00+00',
    '2026-09-16 19:30:00+00',
    'https://www.federalreserve.gov/newsevents/2026-september.htm'
  )
ON CONFLICT (currency, title, starts_at) DO NOTHING;
