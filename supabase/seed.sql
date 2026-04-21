-- =============================================================================
-- folio.e8e — public reference seed data
-- Auto-run by `supabase db reset`. User-scoped seed is in seeds/seed-users.mjs
-- because auth.users creation requires the admin API, not raw SQL.
--
-- Acceptance (T1.2): 100 sample signals, 461 ticker composite scores.
-- Synthetic data — real values arrive via the nightly FMP ETL (T2.3) and the
-- signal ingestion pipeline (T2.2).
-- =============================================================================

-- 461 synthetic tickers, composite scores between 30 and 95
INSERT INTO public.stock_composite_scores (ticker, as_of_date, composite_score, sector, market_cap)
SELECT
  'SYN' || LPAD(n::text, 3, '0') AS ticker,
  CURRENT_DATE                   AS as_of_date,
  30 + ((n * 37) % 65)           AS composite_score,
  (ARRAY['Technology','Financials','Healthcare','Consumer Discretionary','Consumer Staples',
         'Energy','Industrials','Utilities','Materials','Real Estate','Communication Services'])[1 + (n % 11)] AS sector,
  (1e9 + (n * 7e8))              AS market_cap
FROM generate_series(1, 461) AS n
ON CONFLICT (ticker, as_of_date) DO NOTHING;

-- 100 synthetic signals spread across the last 48 hours
INSERT INTO public.signals (source, source_id, ticker, event_type, headline, summary, sentiment, materiality, published_at)
SELECT
  (ARRAY['benzinga','polygon','edgar'])[1 + (n % 3)]  AS source,
  'seed-' || n                                        AS source_id,
  'SYN' || LPAD(((n * 11) % 461 + 1)::text, 3, '0')   AS ticker,
  (ARRAY['earnings','guidance','insider_buy','insider_sell','8k','analyst','product'])[1 + (n % 7)] AS event_type,
  'Synthetic headline ' || n                          AS headline,
  'Auto-generated seed summary for signal ' || n      AS summary,
  ((n % 21) - 10) / 10.0                              AS sentiment,
  (n % 10) / 10.0                                     AS materiality,
  now() - (n || ' minutes')::interval                 AS published_at
FROM generate_series(1, 100) AS n
ON CONFLICT (source, source_id) DO NOTHING;
