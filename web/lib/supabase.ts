import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses anon key, respects RLS)
// Lazy-initialized to avoid crashes during Next.js build when env vars aren't set
let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

// Convenience alias — use in client components via: import { supabase } from '@/lib/supabase'
// Calls getSupabase() on first use, not at import time
export { getSupabase as supabaseClient };

// Server-side Supabase client (uses service_role key, bypasses RLS)
// Only use in API routes and server components, never on the client
export function createServerClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Types matching the database schema
export type FeedbackStatus =
  | 'received'
  | 'triaged'
  | 'accepted'
  | 'in_progress'
  | 'in_review'
  | 'deployed'
  | 'confirmed'
  | 'rejected'
  | 'duplicate';

export type FeedbackCategory =
  | 'bug'
  | 'feature'
  | 'question'
  | 'improvement'
  | 'documentation'
  | 'other';

export type FeedbackPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface FeedbackItem {
  id: string;
  created_at: string;
  updated_at: string;
  slack_channel_id: string | null;
  slack_thread_ts: string | null;
  slack_message_ts: string | null;
  slack_user_id: string | null;
  slack_user_name: string | null;
  raw_message: string;
  summary: string | null;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  github_issue_url: string | null;
  github_pr_url: string | null;
  github_branch: string | null;
  resolution_notes: string | null;
  deployed_at: string | null;
  confirmed_at: string | null;
  tags: string[];
  affected_component: string | null;
  metadata: Record<string, unknown>;
}

export interface Requirement {
  id: string;
  created_at: string;
  updated_at: string;
  feedback_item_id: string | null;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  estimated_effort: string | null;
  story_points: number | null;
  github_issue_url: string | null;
  github_pr_url: string | null;
  assigned_to: string | null;
  metadata: Record<string, unknown>;
}
