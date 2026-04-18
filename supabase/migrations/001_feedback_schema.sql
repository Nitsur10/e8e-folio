-- =============================================================================
-- FEEDBACK LOOP SCHEMA
-- Tracks user feedback from Slack through to deployment
-- =============================================================================

-- Status enum for feedback lifecycle
CREATE TYPE feedback_status AS ENUM (
  'received',     -- raw message captured from Slack
  'triaged',      -- classified by Claude (bug/feature/question)
  'accepted',     -- approved as a valid requirement
  'in_progress',  -- development has started
  'in_review',    -- PR created and under review
  'deployed',     -- merged and deployed to production
  'confirmed',    -- user notified and confirmed working
  'rejected',     -- not going to action this
  'duplicate'     -- duplicate of another item
);

-- Category enum
CREATE TYPE feedback_category AS ENUM (
  'bug',
  'feature',
  'question',
  'improvement',
  'documentation',
  'other'
);

-- Priority enum
CREATE TYPE feedback_priority AS ENUM (
  'P0',  -- critical: system down, data loss
  'P1',  -- high: major feature broken
  'P2',  -- medium: minor bug or important feature
  'P3'   -- low: nice to have, cosmetic
);

-- =============================================================================
-- Main feedback items table
-- =============================================================================
CREATE TABLE IF NOT EXISTS feedback_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Source tracking
  slack_channel_id TEXT,
  slack_thread_ts TEXT,
  slack_message_ts TEXT,
  slack_user_id TEXT,
  slack_user_name TEXT,
  
  -- Content
  raw_message TEXT NOT NULL,
  summary TEXT,                    -- Claude's summary of the feedback
  
  -- Classification (set by Claude routine)
  category feedback_category DEFAULT 'other',
  priority feedback_priority DEFAULT 'P3',
  status feedback_status DEFAULT 'received',
  
  -- Development tracking
  github_issue_url TEXT,
  github_pr_url TEXT,
  github_branch TEXT,
  
  -- Resolution
  resolution_notes TEXT,
  deployed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  
  -- Tags for filtering
  tags TEXT[] DEFAULT '{}',
  affected_component TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- Requirements table (parsed from feedback)
-- =============================================================================
CREATE TABLE IF NOT EXISTS requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Link to source feedback
  feedback_item_id UUID REFERENCES feedback_items(id) ON DELETE SET NULL,
  
  -- Requirement details
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT,
  
  -- Classification
  category feedback_category DEFAULT 'feature',
  priority feedback_priority DEFAULT 'P2',
  status feedback_status DEFAULT 'received',
  
  -- Effort estimation
  estimated_effort TEXT,          -- e.g. "small", "medium", "large"
  story_points INTEGER,
  
  -- Development tracking
  github_issue_url TEXT,
  github_pr_url TEXT,
  assigned_to TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- Routine run logs (tracks what the nightly classifier did)
-- =============================================================================
CREATE TABLE IF NOT EXISTS routine_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  routine_name TEXT NOT NULL,              -- e.g. 'feedback-classifier'
  run_type TEXT NOT NULL,                  -- 'scheduled', 'manual', 'api_trigger'
  
  items_processed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  
  summary TEXT,                            -- what the routine did
  errors TEXT[],                           -- any errors encountered
  
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- Indexes for common queries
-- =============================================================================
CREATE INDEX idx_feedback_status ON feedback_items(status);
CREATE INDEX idx_feedback_category ON feedback_items(category);
CREATE INDEX idx_feedback_priority ON feedback_items(priority);
CREATE INDEX idx_feedback_created ON feedback_items(created_at DESC);
CREATE INDEX idx_feedback_slack_thread ON feedback_items(slack_thread_ts);
CREATE INDEX idx_feedback_tags ON feedback_items USING GIN(tags);

CREATE INDEX idx_requirements_status ON requirements(status);
CREATE INDEX idx_requirements_priority ON requirements(priority);
CREATE INDEX idx_requirements_feedback ON requirements(feedback_item_id);

CREATE INDEX idx_routine_logs_name ON routine_logs(routine_name);
CREATE INDEX idx_routine_logs_created ON routine_logs(created_at DESC);

-- =============================================================================
-- Auto-update updated_at trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_items_updated_at
  BEFORE UPDATE ON feedback_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER requirements_updated_at
  BEFORE UPDATE ON requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by routines and server functions)
CREATE POLICY "Service role full access on feedback_items"
  ON feedback_items FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on requirements"
  ON requirements FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on routine_logs"
  ON routine_logs FOR ALL
  USING (auth.role() = 'service_role');

-- Anon can read feedback items (for the public dashboard widget)
CREATE POLICY "Anon can read feedback items"
  ON feedback_items FOR SELECT
  USING (auth.role() = 'anon');

-- Anon can insert feedback (from the feedback widget)
CREATE POLICY "Anon can insert feedback"
  ON feedback_items FOR INSERT
  WITH CHECK (auth.role() = 'anon');
