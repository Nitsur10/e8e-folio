export type { Database, Json } from './database.types';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type CapitalTier = 'learner' | 'standard' | 'active' | 'pro';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type ApprovalMode = 'ask_me' | 'auto_under_200';

export type UserAction = 'approved' | 'rejected' | 'dismissed' | 'saved';

export type FactorLens =
  | 'valuation'
  | 'quality'
  | 'growth'
  | 'health'
  | 'smart_money'
  | 'momentum'
  | 'capital_return';
