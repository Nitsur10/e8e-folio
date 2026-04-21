/**
 * Hand-maintained skeleton of the Supabase database types for folio.e8e.
 *
 * Once a Supabase project is wired up, regenerate via:
 *
 *   pnpm dlx supabase gen types typescript \
 *     --project-id "$SUPABASE_PROJECT_ID" --schema public \
 *     > shared/src/types/database.types.ts
 *
 * The generated output replaces this file wholesale. Keep this placeholder
 * tight — just enough for strict TS on day one.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users_profile: {
        Row: {
          user_id: string;
          display_name: string | null;
          capital_tier: 'learner' | 'standard' | 'active' | 'pro' | null;
          risk_tolerance: 'conservative' | 'moderate' | 'aggressive' | null;
          approval_mode: 'ask_me' | 'auto_under_200';
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['users_profile']['Row']> & {
          user_id: string;
        };
        Update: Partial<Database['public']['Tables']['users_profile']['Row']>;
      };
      broker_connections: {
        Row: {
          id: string;
          user_id: string;
          broker: 'alpaca_paper';
          encrypted_key: string;
          encrypted_secret: string;
          kms_key_id: string;
          verified_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['broker_connections']['Row'], 'id' | 'created_at' | 'verified_at' | 'revoked_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['broker_connections']['Row']>;
      };
      signals: {
        Row: {
          id: string;
          source: string;
          source_id: string;
          ticker: string | null;
          event_type: string | null;
          headline: string;
          summary: string | null;
          sentiment: number | null;
          materiality: number | null;
          raw_payload: Json | null;
          published_at: string;
          ingested_at: string;
        };
        Insert: Omit<Database['public']['Tables']['signals']['Row'], 'id' | 'ingested_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['signals']['Row']>;
      };
      stock_fundamentals: {
        Row: {
          ticker: string;
          as_of_date: string;
          period_type: 'quarterly' | 'annual' | 'ttm';
          raw_data: Json;
          updated_at: string;
        };
        Insert: Database['public']['Tables']['stock_fundamentals']['Row'];
        Update: Partial<Database['public']['Tables']['stock_fundamentals']['Row']>;
      };
      stock_scores: {
        Row: {
          ticker: string;
          as_of_date: string;
          factor_name: string;
          raw_value: number | null;
          normalized_score: number | null;
          weight: number | null;
          weighted_contribution: number | null;
          lens: string | null;
        };
        Insert: Database['public']['Tables']['stock_scores']['Row'];
        Update: Partial<Database['public']['Tables']['stock_scores']['Row']>;
      };
      stock_composite_scores: {
        Row: {
          ticker: string;
          as_of_date: string;
          composite_score: number | null;
          sector: string | null;
          market_cap: number | null;
        };
        Insert: Database['public']['Tables']['stock_composite_scores']['Row'];
        Update: Partial<Database['public']['Tables']['stock_composite_scores']['Row']>;
      };
      decisions: {
        Row: {
          id: string;
          user_id: string;
          ticker: string;
          query_type: 'advisor_query' | 'paper_trade_intent';
          agent_output: Json | null;
          user_action: 'approved' | 'rejected' | 'dismissed' | 'saved' | null;
          user_note: string | null;
          trace_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['decisions']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['decisions']['Row']>;
      };
      user_memory: {
        Row: {
          id: string;
          user_id: string;
          ticker: string | null;
          memory_type: 'preference' | 'rejection_pattern' | 'note';
          content: Json;
          decision_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_memory']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['user_memory']['Row']>;
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          decision_id: string | null;
          alpaca_order_id: string | null;
          ticker: string;
          side: 'buy' | 'sell';
          quantity: number;
          order_type: string;
          status: 'pending' | 'filled' | 'rejected' | 'cancelled';
          filled_price: number | null;
          filled_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trades']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['trades']['Row']>;
      };
      retrospectives: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string;
          generated_at: string;
          content: Json;
          viewed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['retrospectives']['Row'], 'id' | 'generated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['retrospectives']['Row']>;
      };
      traces: {
        Row: {
          id: string;
          user_id: string | null;
          agent_name: string;
          context_manifest: Json | null;
          tool_calls: Json | null;
          llm_input: Json | null;
          llm_output: Json | null;
          duration_ms: number | null;
          cost_usd: number | null;
          langfuse_trace_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['traces']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['traces']['Row']>;
      };
      watchlist: {
        Row: {
          user_id: string;
          ticker: string;
          added_at: string;
          alert_criteria: Json | null;
        };
        Insert: Database['public']['Tables']['watchlist']['Row'];
        Update: Partial<Database['public']['Tables']['watchlist']['Row']>;
      };
    };
  };
}
