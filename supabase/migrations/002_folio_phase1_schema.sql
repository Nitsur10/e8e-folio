-- =============================================================================
-- folio.e8e — Phase 1 schema
-- Reference: files_v3/HANDOFF_02_phase1_tasks.md Appendix A
--
-- feedback_items from Appendix A is intentionally NOT created here; the
-- template's Slack-ops feedback_items (migration 001) is kept as-is per the
-- v3 note "keep it if functional and wire into T1.2's schema". Revisit when
-- we build the in-app user feedback widget (Phase 2 learning).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Users — profile extending auth.users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  capital_tier text CHECK (capital_tier IN ('learner', 'standard', 'active', 'pro')),
  risk_tolerance text CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  approval_mode text DEFAULT 'ask_me' CHECK (approval_mode IN ('ask_me', 'auto_under_200')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- Broker connections — encrypted Alpaca keys (KMS envelope)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broker_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users_profile(user_id) ON DELETE CASCADE,
  broker text NOT NULL CHECK (broker = 'alpaca_paper'),
  encrypted_key bytea NOT NULL,
  encrypted_secret bytea NOT NULL,
  kms_key_id text NOT NULL,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, broker)
);

-- -----------------------------------------------------------------------------
-- Signal bus — public reference data (no per-user RLS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  ticker text,
  event_type text,
  headline text NOT NULL,
  summary text,
  sentiment numeric,
  materiality numeric,
  raw_payload jsonb,
  published_at timestamptz NOT NULL,
  ingested_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (source, source_id)
);
CREATE INDEX IF NOT EXISTS idx_signals_ticker_published
  ON public.signals(ticker, published_at DESC);

-- -----------------------------------------------------------------------------
-- Fundamentals — raw FMP payloads (public reference)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_fundamentals (
  ticker text NOT NULL,
  as_of_date date NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('quarterly', 'annual', 'ttm')),
  raw_data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (ticker, as_of_date, period_type)
);

-- -----------------------------------------------------------------------------
-- Stock scores — per-factor (40 factors * 461 tickers per as-of-date)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_scores (
  ticker text NOT NULL,
  as_of_date date NOT NULL,
  factor_name text NOT NULL,
  raw_value numeric,
  normalized_score numeric CHECK (normalized_score BETWEEN 0 AND 100),
  weight numeric,
  weighted_contribution numeric,
  lens text,
  PRIMARY KEY (ticker, as_of_date, factor_name)
);
CREATE INDEX IF NOT EXISTS idx_stock_scores_asof
  ON public.stock_scores(as_of_date, ticker);

-- -----------------------------------------------------------------------------
-- Composite scores — denormalised for fast top-N queries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_composite_scores (
  ticker text NOT NULL,
  as_of_date date NOT NULL,
  composite_score numeric CHECK (composite_score BETWEEN 0 AND 100),
  sector text,
  market_cap numeric,
  PRIMARY KEY (ticker, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_composite_desc
  ON public.stock_composite_scores(as_of_date, composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_composite_sector
  ON public.stock_composite_scores(sector, as_of_date);

-- -----------------------------------------------------------------------------
-- Decisions — every Advisor query + user action (the memory spine)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users_profile(user_id) ON DELETE CASCADE,
  ticker text NOT NULL,
  query_type text NOT NULL CHECK (query_type IN ('advisor_query', 'paper_trade_intent')),
  agent_output jsonb,
  user_action text CHECK (user_action IN ('approved', 'rejected', 'dismissed', 'saved')),
  user_note text,
  trace_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decisions_user_ticker
  ON public.decisions(user_id, ticker, created_at DESC);

-- -----------------------------------------------------------------------------
-- User memory — what the Advisor remembers for a given user
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users_profile(user_id) ON DELETE CASCADE,
  ticker text,
  memory_type text NOT NULL CHECK (memory_type IN ('preference', 'rejection_pattern', 'note')),
  content jsonb NOT NULL,
  decision_id uuid REFERENCES public.decisions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memory_user_ticker
  ON public.user_memory(user_id, ticker, created_at DESC);

-- -----------------------------------------------------------------------------
-- Paper trades
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users_profile(user_id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.decisions(id) ON DELETE SET NULL,
  alpaca_order_id text UNIQUE,
  ticker text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity numeric NOT NULL,
  order_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'filled', 'rejected', 'cancelled')),
  filled_price numeric,
  filled_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trades_user_created
  ON public.trades(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Retrospectives — 30-day post-trade
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retrospectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users_profile(user_id) ON DELETE CASCADE,
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now() NOT NULL,
  content jsonb NOT NULL,
  viewed_at timestamptz,
  UNIQUE (trade_id)
);

-- -----------------------------------------------------------------------------
-- Traces — full agent execution record
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users_profile(user_id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  context_manifest jsonb,
  tool_calls jsonb,
  llm_input jsonb,
  llm_output jsonb,
  duration_ms integer,
  cost_usd numeric,
  langfuse_trace_id text,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_traces_user_created
  ON public.traces(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Watchlist
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlist (
  user_id uuid NOT NULL REFERENCES public.users_profile(user_id) ON DELETE CASCADE,
  ticker text NOT NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  alert_criteria jsonb,
  PRIMARY KEY (user_id, ticker)
);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER users_profile_updated_at
  BEFORE UPDATE ON public.users_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Row Level Security
-- User-scoped tables: owner can read/write own rows; service_role has full
-- access for workers and cron handlers. Public reference tables are read-only
-- to authenticated clients.
-- =============================================================================

-- users_profile
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_profile owner"      ON public.users_profile FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_profile service"    ON public.users_profile FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- broker_connections
ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker owner"             ON public.broker_connections FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "broker service"           ON public.broker_connections FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- decisions
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisions owner"          ON public.decisions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "decisions service"        ON public.decisions FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- user_memory
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memory owner"             ON public.user_memory FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "memory service"           ON public.user_memory FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trades owner"             ON public.trades FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trades service"           ON public.trades FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- retrospectives
ALTER TABLE public.retrospectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retro owner"              ON public.retrospectives FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "retro service"            ON public.retrospectives FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- traces
ALTER TABLE public.traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "traces owner"             ON public.traces FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "traces service"           ON public.traces FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- watchlist
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlist owner"          ON public.watchlist FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist service"        ON public.watchlist FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Public reference — readable to everyone logged in, writable only by service_role
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signals read"             ON public.signals FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "signals service"          ON public.signals FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.stock_fundamentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fund read"                ON public.stock_fundamentals FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "fund service"             ON public.stock_fundamentals FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.stock_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores read"              ON public.stock_scores FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "scores service"           ON public.stock_scores FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.stock_composite_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "composite read"           ON public.stock_composite_scores FOR SELECT
  USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "composite service"        ON public.stock_composite_scores FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
