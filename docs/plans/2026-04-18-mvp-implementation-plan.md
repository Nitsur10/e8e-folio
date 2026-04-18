# folio.e8e MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first AI trading agent platform where users create agents that propose paper trades, get human approval, and execute via Alpaca -- with full transparency and auditability.

**Architecture:** Turborepo monorepo with Expo (mobile), Next.js (API), Inngest (durable workflows), Supabase (DB/Auth/Realtime), Upstash Redis (signal bus), and Alpaca (paper trading). Claude Sonnet for agent decisions, Haiku for signal enrichment.

**Tech Stack:** TypeScript, pnpm, Turborepo, Expo SDK 52, Next.js 15, tRPC v11, Inngest, Supabase, Upstash Redis, Vercel AI SDK, Zod, React Native Reanimated, Vitest

**Design Doc:** `docs/plans/2026-04-18-mvp-architecture-design.md`

---

## Phase 1: Foundation (Monorepo + Core + DB)

Everything depends on this. Monorepo structure, shared types, database schema, and Supabase client.

---

### Task 1.1: Convert to pnpm + Turborepo monorepo

**Files:**
- Modify: `package.json` (root workspace config)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Modify: `vercel.json` (point to apps/web)
- Delete: `node_modules/`, `package-lock.json`

**Step 1: Create pnpm workspace config**

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

**Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "sourceMap": true
  },
  "exclude": ["node_modules"]
}
```

**Step 4: Update root package.json**

```json
{
  "name": "e8e-folio",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

**Step 5: Remove old node_modules and package-lock.json**

Run: `rm -rf node_modules package-lock.json`

**Step 6: Install pnpm and dependencies**

Run: `npm install -g pnpm && pnpm install`

**Step 7: Verify monorepo structure**

Run: `pnpm turbo --version`
Expected: Version output, no errors

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: convert to pnpm + Turborepo monorepo"
```

---

### Task 1.2: Move existing Next.js app to apps/web

**Files:**
- Create: `apps/web/` directory
- Move: `src/`, `next.config.mjs`, `next-env.d.ts`, `tsconfig.json` into `apps/web/`
- Create: `apps/web/package.json`
- Modify: `vercel.json` (root directory setting)

**Step 1: Create apps/web directory and move files**

Run:
```bash
mkdir -p apps/web
mv src apps/web/
mv next.config.mjs apps/web/
mv next-env.d.ts apps/web/
mv tsconfig.json apps/web/tsconfig.json
```

**Step 2: Create apps/web/package.json**

```json
{
  "name": "@e8e/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "next": "^15.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 3: Update apps/web/tsconfig.json**

Update to extend base config:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "noEmit": true,
    "jsx": "preserve",
    "incremental": true,
    "composite": false,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Update vercel.json**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@e8e/web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm install -g pnpm && pnpm install",
  "rootDirectory": "apps/web"
}
```

**Step 5: Install dependencies**

Run: `pnpm install`

**Step 6: Verify build**

Run: `pnpm turbo build --filter=@e8e/web`
Expected: Next.js builds successfully

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: move Next.js app to apps/web"
```

---

### Task 1.3: Create packages/core with Zod schemas

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/schemas/agent.ts`
- Create: `packages/core/src/schemas/decision.ts`
- Create: `packages/core/src/schemas/order.ts`
- Create: `packages/core/src/schemas/position.ts`
- Create: `packages/core/src/schemas/signal.ts`
- Create: `packages/core/src/schemas/profile.ts`
- Create: `packages/core/src/schemas/trace.ts`
- Create: `packages/core/src/schemas/index.ts`
- Create: `packages/core/src/events.ts`
- Create: `packages/core/src/constants.ts`
- Test: `packages/core/src/__tests__/schemas.test.ts`

**Step 1: Create package.json**

```json
{
  "name": "@e8e/core",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "src/**/*.test.ts"]
}
```

**Step 3: Write Zod schemas**

Create `packages/core/src/schemas/agent.ts`:

```typescript
import { z } from 'zod';

export const RiskProfile = z.enum(['conservative', 'moderate', 'aggressive']);
export type RiskProfile = z.infer<typeof RiskProfile>;

export const AgentMode = z.enum(['paper']);
export type AgentMode = z.infer<typeof AgentMode>;

export const AgentLifecycleState = z.enum([
  'draft',
  'paper',
  'paused',
  'retired',
]);
export type AgentLifecycleState = z.infer<typeof AgentLifecycleState>;

export const AgentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  ticker: z.string().min(1).max(10).toUpperCase(),
  strategy: z.string().max(1000),
  risk_profile: RiskProfile,
  position_size_pct: z.number().min(0.01).max(1.0),
  max_daily_trades: z.number().int().min(1).max(50),
  mode: AgentMode,
  lifecycle_state: AgentLifecycleState,
  drift_baseline: z.record(z.unknown()).nullable(),
  paper_start_date: z.string().datetime().nullable(),
  total_decisions: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Agent = z.infer<typeof AgentSchema>;

export const CreateAgentInput = AgentSchema.pick({
  name: true,
  ticker: true,
  strategy: true,
  risk_profile: true,
  position_size_pct: true,
  max_daily_trades: true,
});
export type CreateAgentInput = z.infer<typeof CreateAgentInput>;
```

Create `packages/core/src/schemas/decision.ts`:

```typescript
import { z } from 'zod';

export const TriggerType = z.enum(['cron', 'signal', 'user']);
export type TriggerType = z.infer<typeof TriggerType>;

export const TradeAction = z.enum(['buy', 'sell', 'hold', 'skip']);
export type TradeAction = z.infer<typeof TradeAction>;

export const DecisionStatus = z.enum([
  'proposed',
  'approved',
  'rejected',
  'executed',
  'failed',
  'expired',
]);
export type DecisionStatus = z.infer<typeof DecisionStatus>;

export const HumanApproval = z.enum([
  'pending',
  'approved',
  'rejected',
  'auto',
]);
export type HumanApproval = z.infer<typeof HumanApproval>;

export const ConstraintResult = z.object({
  layer: z.string(),
  passed: z.boolean(),
  reason: z.string().nullable(),
});
export type ConstraintResult = z.infer<typeof ConstraintResult>;

export const AgentProposal = z.object({
  action: TradeAction,
  ticker: z.string().toUpperCase(),
  quantity: z.number().int().min(0),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  time_horizon: z.string().optional(),
});
export type AgentProposal = z.infer<typeof AgentProposal>;

export const DecisionSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  user_id: z.string().uuid(),
  trigger_type: TriggerType,
  action: TradeAction,
  ticker: z.string(),
  quantity: z.number().int(),
  price_at_decision: z.number().nullable(),
  reasoning: z.string(),
  proposal_json: AgentProposal,
  constraint_results: z.array(ConstraintResult),
  context_manifest_hash: z.string(),
  prompt_version: z.string(),
  status: DecisionStatus,
  human_approval: HumanApproval,
  approval_expires_at: z.string().datetime().nullable(),
  retrospective_text: z.string().nullable(),
  signals_used: z.array(z.string().uuid()),
  created_at: z.string().datetime(),
});
export type Decision = z.infer<typeof DecisionSchema>;
```

Create `packages/core/src/schemas/order.ts`:

```typescript
import { z } from 'zod';

export const OrderSide = z.enum(['buy', 'sell']);
export type OrderSide = z.infer<typeof OrderSide>;

export const OrderType = z.enum(['market', 'limit', 'stop', 'stop_limit']);
export type OrderType = z.infer<typeof OrderType>;

export const TimeInForce = z.enum(['day', 'gtc', 'ioc', 'fok']);
export type TimeInForce = z.infer<typeof TimeInForce>;

export const OrderStatus = z.enum([
  'submitted',
  'filled',
  'partial',
  'cancelled',
  'rejected',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  decision_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  alpaca_order_id: z.string().nullable(),
  side: OrderSide,
  qty: z.number().int().min(1),
  order_type: OrderType,
  time_in_force: TimeInForce,
  limit_price: z.number().nullable(),
  stop_price: z.number().nullable(),
  filled_price: z.number().nullable(),
  filled_qty: z.number().int().nullable(),
  status: OrderStatus,
  idempotency_key: z.string(),
  created_at: z.string().datetime(),
  filled_at: z.string().datetime().nullable(),
});
export type Order = z.infer<typeof OrderSchema>;
```

Create `packages/core/src/schemas/position.ts`:

```typescript
import { z } from 'zod';

export const PositionSchema = z.object({
  id: z.string().uuid(),
  agent_id: z.string().uuid(),
  user_id: z.string().uuid(),
  ticker: z.string(),
  qty: z.number().int(),
  avg_entry_price: z.number(),
  current_price: z.number(),
  unrealized_pnl: z.number(),
  updated_at: z.string().datetime(),
});
export type Position = z.infer<typeof PositionSchema>;
```

Create `packages/core/src/schemas/signal.ts`:

```typescript
import { z } from 'zod';

export const SignalSource = z.enum(['alpaca', 'benzinga', 'polygon', 'edgar']);
export type SignalSource = z.infer<typeof SignalSource>;

export const Materiality = z.enum(['low', 'medium', 'high']);
export type Materiality = z.infer<typeof Materiality>;

export const SignalSchema = z.object({
  id: z.string().uuid(),
  source: SignalSource,
  ticker: z.string(),
  headline: z.string(),
  body_hash: z.string(),
  sentiment: z.number().min(-1).max(1),
  novelty: z.boolean(),
  materiality: Materiality,
  relevance_score: z.number().min(0).max(1),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
});
export type Signal = z.infer<typeof SignalSchema>;

export const EnrichmentOutput = z.object({
  sentiment: z.number().min(-1).max(1),
  novelty: z.boolean(),
  materiality: Materiality,
  summary: z.string().max(200),
});
export type EnrichmentOutput = z.infer<typeof EnrichmentOutput>;
```

Create `packages/core/src/schemas/profile.ts`:

```typescript
import { z } from 'zod';
import { RiskProfile } from './agent';

export const OnboardingStep = z.enum([
  'welcome',
  'value_props',
  'questionnaire',
  'broker_connect',
  'first_agent',
  'completed',
]);
export type OnboardingStep = z.infer<typeof OnboardingStep>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  display_name: z.string().nullable(),
  risk_tolerance: RiskProfile.nullable(),
  investment_experience: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
  onboarding_step: OnboardingStep,
  push_enabled: z.boolean().default(true),
  biometric_enabled: z.boolean().default(false),
  approval_timeout_minutes: z.number().int().min(5).max(1440).default(60),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Profile = z.infer<typeof ProfileSchema>;
```

Create `packages/core/src/schemas/trace.ts`:

```typescript
import { z } from 'zod';

export const TraceSchema = z.object({
  id: z.string().uuid(),
  decision_id: z.string().uuid().nullable(),
  agent_id: z.string().uuid().nullable(),
  prompt_hash: z.string(),
  model: z.string(),
  temperature: z.number(),
  input_tokens: z.number().int(),
  output_tokens: z.number().int(),
  latency_ms: z.number().int(),
  cost_usd: z.number(),
  created_at: z.string().datetime(),
});
export type Trace = z.infer<typeof TraceSchema>;
```

Create `packages/core/src/schemas/index.ts`:

```typescript
export * from './agent';
export * from './decision';
export * from './order';
export * from './position';
export * from './signal';
export * from './profile';
export * from './trace';
```

**Step 4: Write Inngest event types**

Create `packages/core/src/events.ts`:

```typescript
import { z } from 'zod';
import { AgentProposal } from './schemas/decision';

export const InngestEvents = {
  'agent/decision.requested': z.object({
    agent_id: z.string().uuid(),
    user_id: z.string().uuid(),
    trigger_type: z.enum(['cron', 'signal', 'user']),
    trigger_payload: z.record(z.unknown()).optional(),
  }),

  'agent/decision.proposed': z.object({
    decision_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    user_id: z.string().uuid(),
    proposal: AgentProposal,
  }),

  'agent/decision.approved': z.object({
    decision_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    user_id: z.string().uuid(),
  }),

  'agent/decision.rejected': z.object({
    decision_id: z.string().uuid(),
    agent_id: z.string().uuid(),
    user_id: z.string().uuid(),
    reason: z.string().optional(),
  }),

  'agent/decision.expired': z.object({
    decision_id: z.string().uuid(),
    agent_id: z.string().uuid(),
  }),

  'agent/killswitch.toggled': z.object({
    user_id: z.string().uuid(),
    agent_id: z.string().uuid().optional(),
    enabled: z.boolean(),
  }),

  'signal/pipeline.triggered': z.object({
    source: z.string().optional(),
    market_hours: z.boolean(),
  }),

  'order/fill.received': z.object({
    order_id: z.string().uuid(),
    alpaca_order_id: z.string(),
    filled_price: z.number(),
    filled_qty: z.number().int(),
  }),

  'notification/push.send': z.object({
    user_id: z.string().uuid(),
    title: z.string(),
    body: z.string(),
    data: z.record(z.unknown()).optional(),
  }),
} as const;

export type InngestEventMap = {
  [K in keyof typeof InngestEvents]: z.infer<(typeof InngestEvents)[K]>;
};
```

**Step 5: Write constants**

Create `packages/core/src/constants.ts`:

```typescript
export const CONSTRAINTS = {
  MAX_POSITION_SIZE_PCT: 0.25,
  MAX_PORTFOLIO_EXPOSURE: 0.90,
  MAX_DAILY_TRADES: 10,
  MAX_LLM_RETRIES: 2,
  APPROVAL_TIMEOUT_MINUTES: 60,
  DAILY_LLM_COST_CAP_USD: 10.0,
  DAILY_API_CALL_CAP: 1000,
} as const;

export const MARKET_HOURS = {
  OPEN: { hour: 9, minute: 30 },
  CLOSE: { hour: 16, minute: 0 },
  TIMEZONE: 'America/New_York',
  SIGNAL_INTERVAL_MARKET: '*/3 * * * *',
  SIGNAL_INTERVAL_AFTER: '*/30 * * * *',
} as const;

export const LLM_CONFIG = {
  DECISION_MODEL: 'claude-sonnet-4-6',
  ENRICHMENT_MODEL: 'claude-haiku-4-5-20251001',
  DECISION_TEMPERATURE: 0,
  ENRICHMENT_TEMPERATURE: 0,
} as const;

export const ALPACA = {
  PAPER_BASE_URL: 'https://paper-api.alpaca.markets',
  DATA_BASE_URL: 'https://data.alpaca.markets',
} as const;
```

**Step 6: Create barrel export**

Create `packages/core/src/index.ts`:

```typescript
export * from './schemas';
export * from './events';
export * from './constants';
```

**Step 7: Write tests**

Create `packages/core/src/__tests__/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  AgentSchema,
  CreateAgentInput,
  AgentProposal,
  DecisionSchema,
  OrderSchema,
  PositionSchema,
  SignalSchema,
  ProfileSchema,
  TraceSchema,
} from '../schemas';

describe('AgentSchema', () => {
  it('validates a valid agent', () => {
    const result = CreateAgentInput.safeParse({
      name: 'AAPL Momentum',
      ticker: 'aapl',
      strategy: 'Buy on positive sentiment with volume confirmation',
      risk_profile: 'moderate',
      position_size_pct: 0.1,
      max_daily_trades: 3,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticker).toBe('AAPL');
    }
  });

  it('rejects invalid position size', () => {
    const result = CreateAgentInput.safeParse({
      name: 'Bad Agent',
      ticker: 'AAPL',
      strategy: 'Test',
      risk_profile: 'moderate',
      position_size_pct: 2.0,
      max_daily_trades: 3,
    });
    expect(result.success).toBe(false);
  });
});

describe('AgentProposal', () => {
  it('validates a valid proposal', () => {
    const result = AgentProposal.safeParse({
      action: 'buy',
      ticker: 'aapl',
      quantity: 10,
      reasoning: 'Strong earnings beat with positive guidance',
      confidence: 0.85,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ticker).toBe('AAPL');
    }
  });

  it('rejects confidence > 1', () => {
    const result = AgentProposal.safeParse({
      action: 'buy',
      ticker: 'AAPL',
      quantity: 10,
      reasoning: 'Test',
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('SignalSchema', () => {
  it('validates sentiment range', () => {
    const result = SignalSchema.shape.sentiment.safeParse(-0.75);
    expect(result.success).toBe(true);
  });

  it('rejects sentiment out of range', () => {
    const result = SignalSchema.shape.sentiment.safeParse(1.5);
    expect(result.success).toBe(false);
  });
});
```

**Step 8: Run tests**

Run: `cd packages/core && pnpm test`
Expected: All tests pass

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add packages/core with Zod schemas, events, and constants"
```

---

### Task 1.4: Create packages/db with Supabase client and typed queries

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/queries/agents.ts`
- Create: `packages/db/src/queries/decisions.ts`
- Create: `packages/db/src/queries/orders.ts`
- Create: `packages/db/src/queries/positions.ts`
- Create: `packages/db/src/queries/signals.ts`
- Create: `packages/db/src/queries/profiles.ts`
- Create: `packages/db/src/queries/traces.ts`
- Create: `packages/db/src/queries/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@e8e/db",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@e8e/core": "workspace:*",
    "@supabase/supabase-js": "^2.49.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create client.ts**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _serverClient: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}

export function getServerClient(): SupabaseClient {
  if (!_serverClient) {
    _serverClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return _serverClient;
}
```

**Step 3: Create query modules**

Each query module follows the same pattern -- typed functions wrapping Supabase queries. Example for agents:

Create `packages/db/src/queries/agents.ts`:

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import type { Agent, CreateAgentInput, AgentLifecycleState } from '@e8e/core';

export function agentQueries(db: SupabaseClient) {
  return {
    async list(userId: string): Promise<Agent[]> {
      const { data, error } = await db
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Agent[];
    },

    async getById(agentId: string, userId: string): Promise<Agent | null> {
      const { data, error } = await db
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Agent | null;
    },

    async create(userId: string, input: CreateAgentInput): Promise<Agent> {
      const { data, error } = await db
        .from('agents')
        .insert({
          user_id: userId,
          ...input,
          mode: 'paper',
          lifecycle_state: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data as Agent;
    },

    async updateLifecycleState(
      agentId: string,
      userId: string,
      state: AgentLifecycleState,
    ): Promise<Agent> {
      const { data, error } = await db
        .from('agents')
        .update({
          lifecycle_state: state,
          ...(state === 'paper' ? { paper_start_date: new Date().toISOString() } : {}),
        })
        .eq('id', agentId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as Agent;
    },
  };
}
```

Create similar query modules for decisions, orders, positions, signals, profiles, traces -- each exports a factory function that takes a SupabaseClient and returns typed query methods.

**Step 4: Create barrel exports**

Create `packages/db/src/queries/index.ts` and `packages/db/src/index.ts` re-exporting everything.

**Step 5: Verify typecheck**

Run: `pnpm turbo typecheck --filter=@e8e/db`
Expected: No type errors

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add packages/db with typed Supabase client and query modules"
```

---

### Task 1.5: Write database migrations

**Files:**
- Create: `supabase/migrations/002_core_schema.sql`
- Create: `supabase/migrations/003_push_tokens.sql`
- Create: `supabase/migrations/004_feature_flags.sql`

**Step 1: Write 002_core_schema.sql**

Create the full migration with all core tables: profiles, agents, decisions, orders, positions, signals, traces. Include enums, indexes, RLS policies, and updated_at triggers. Reference the design doc Section 2 for exact column definitions.

Key points:
- All UUID primary keys with `gen_random_uuid()`
- Foreign keys: decisions -> agents, orders -> decisions, positions -> agents
- RLS: all tables enforce `user_id = auth.uid()` for select/insert/update
- Service role full access on all tables
- GIN index on `signals(ticker)` for fast agent queries
- Partial index on `decisions(status)` where status = 'proposed' for pending approvals

**Step 2: Write 003_push_tokens.sql**

Push tokens table with unique constraint on (user_id, device_id).

**Step 3: Write 004_feature_flags.sql**

Feature flags table with initial seed data:
- `generative_ui_enabled` = false
- `signal_pipeline_enabled` = true
- `push_notifications_enabled` = true

**Step 4: Apply migrations locally**

Run: `supabase db push` (or `supabase migration up` if using local)
Expected: Migrations apply without errors

**Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add core database schema migrations"
```

---

## Phase 2: Backend Services (Broker + Agent + Signals)

Build the backend packages. Each is independently testable.

---

### Task 2.1: Create packages/broker with Alpaca adapter

**Files:**
- Create: `packages/broker/package.json`
- Create: `packages/broker/tsconfig.json`
- Create: `packages/broker/src/adapters/types.ts` (BrokerAdapter interface)
- Create: `packages/broker/src/adapters/alpaca/client.ts`
- Create: `packages/broker/src/adapters/alpaca/orders.ts`
- Create: `packages/broker/src/adapters/alpaca/positions.ts`
- Create: `packages/broker/src/adapters/alpaca/market-data.ts`
- Create: `packages/broker/src/execution/service.ts`
- Create: `packages/broker/src/execution/idempotency.ts`
- Create: `packages/broker/src/execution/reconciler.ts`
- Create: `packages/broker/src/index.ts`
- Test: `packages/broker/src/__tests__/idempotency.test.ts`
- Test: `packages/broker/src/__tests__/execution.test.ts`

**Key implementation notes:**
- Use `@alpacahq/alpaca-trade-api` npm package or raw fetch against `paper-api.alpaca.markets`
- BrokerAdapter interface: `submitOrder()`, `cancelOrder()`, `getOrder()`, `getPositions()`, `getAccount()`, `getQuote()`
- Idempotency: hash `decision_id` into a key, check against DB before submitting
- ExecutionService: validate order params -> check idempotency -> submit -> return order ID
- Reconciler: poll `GET /v2/orders/{id}` or use Alpaca websocket for fill updates

**Tests:**
- Idempotency key generation is deterministic
- ExecutionService rejects duplicate idempotency keys
- Order params are validated before submission

**Commit:** `feat: add packages/broker with Alpaca adapter and execution service`

---

### Task 2.2: Create packages/agent -- LLM client and prompt registry

**Files:**
- Create: `packages/agent/package.json`
- Create: `packages/agent/tsconfig.json`
- Create: `packages/agent/src/llm/client.ts`
- Create: `packages/agent/src/llm/router.ts`
- Create: `packages/agent/src/llm/types.ts`
- Create: `packages/agent/src/prompts/v1/system.md`
- Create: `packages/agent/src/prompts/v1/decision.md`
- Create: `packages/agent/src/prompts/v1/retrospective.md`
- Create: `packages/agent/src/prompts/registry.ts`
- Create: `packages/agent/src/index.ts`
- Test: `packages/agent/src/__tests__/registry.test.ts`

**Key implementation notes:**
- Use `@ai-sdk/anthropic` + `ai` (Vercel AI SDK) for LLM calls
- Router: maps task type to model (decision -> Sonnet, enrichment -> Haiku)
- Client: wraps `generateObject()` with Zod schema for structured output, captures token usage for tracing
- Prompt registry: reads `.md` files from `prompts/v{version}/`, interpolates variables, returns prompt string + version identifier
- System prompt establishes agent identity, constraints awareness, output format
- Decision prompt includes all 10 context sections as template slots

**Tests:**
- Prompt registry loads correct version
- Prompt registry handles missing version gracefully
- Router returns correct model for each task type

**Commit:** `feat: add packages/agent LLM client and prompt registry`

---

### Task 2.3: Create packages/agent -- Context assembler

**Files:**
- Create: `packages/agent/src/context/assembler.ts`
- Create: `packages/agent/src/context/manifest.ts`
- Create: `packages/agent/src/context/types.ts`
- Create: `packages/agent/src/context/sections/system-identity.ts`
- Create: `packages/agent/src/context/sections/agent-charter.ts`
- Create: `packages/agent/src/context/sections/hard-constraints.ts`
- Create: `packages/agent/src/context/sections/portfolio-state.ts`
- Create: `packages/agent/src/context/sections/market-state.ts`
- Create: `packages/agent/src/context/sections/relevant-signals.ts`
- Create: `packages/agent/src/context/sections/recent-decisions.ts`
- Create: `packages/agent/src/context/sections/available-tools.ts`
- Create: `packages/agent/src/context/sections/current-task.ts`
- Create: `packages/agent/src/context/sections/output-contract.ts`
- Test: `packages/agent/src/__tests__/assembler.test.ts`
- Test: `packages/agent/src/__tests__/manifest.test.ts`

**Key implementation notes:**
- Each section is a pure function: `(deps: SectionDeps) => Promise<SectionOutput>`
- SectionOutput: `{ content: string; metadata: Record<string, unknown> }`
- Assembler calls all 10 sections, concatenates in fixed order, generates manifest hash
- Manifest hash: SHA-256 of all section outputs concatenated -- enables reproducibility
- Each section queries specific data (DB, broker, Redis) -- assembler provides deps
- Sections are independently testable with mock deps

**Tests:**
- Assembler concatenates sections in correct order
- Manifest hash is deterministic for same inputs
- Individual sections return expected format

**Commit:** `feat: add context assembler with 10 deterministic sections`

---

### Task 2.4: Create packages/agent -- Constraint engine

**Files:**
- Create: `packages/agent/src/constraints/engine.ts`
- Create: `packages/agent/src/constraints/types.ts`
- Create: `packages/agent/src/constraints/l1-structural.ts`
- Create: `packages/agent/src/constraints/l2-policy.ts`
- Create: `packages/agent/src/constraints/l3-simulated.ts`
- Create: `packages/agent/src/constraints/l4-rate-cost.ts`
- Create: `packages/agent/src/constraints/l5-killswitch.ts`
- Test: `packages/agent/src/__tests__/constraints.test.ts`

**Key implementation notes:**
- Engine runs layers 1-5 in sequence, short-circuits on failure
- L1: parse proposal through `AgentProposal` Zod schema
- L2: check position_size_pct <= agent config, total exposure <= 90%, daily trade count <= max, no blackout hours
- L3: calculate post-trade portfolio state, check margin requirements, concentration limits
- L4: sum today's LLM costs from traces table, check against daily cap; count API calls
- L5: query feature_flags + agent lifecycle_state -- if killswitch on or agent paused, reject
- Each layer returns `{ passed: boolean; reason: string | null }`
- Engine returns array of all layer results

**Tests:**
- L1 rejects malformed proposals
- L2 rejects oversized positions
- L2 detects cross-agent ticker conflicts
- L3 rejects trades that exceed concentration limits
- L4 throttles when daily cost cap hit
- L5 rejects when killswitch is on
- Engine short-circuits on first failure (skip remaining layers)

**Commit:** `feat: add 5-layer constraint engine`

---

### Task 2.5: Create packages/agent -- Harness, lifecycle, metrics

**Files:**
- Create: `packages/agent/src/harness/index.ts`
- Create: `packages/agent/src/harness/runner.ts`
- Create: `packages/agent/src/harness/types.ts`
- Create: `packages/agent/src/harness/lifecycle.ts`
- Create: `packages/agent/src/harness/drift.ts`
- Create: `packages/agent/src/harness/retrospective.ts`
- Create: `packages/agent/src/harness/metrics.ts`
- Test: `packages/agent/src/__tests__/lifecycle.test.ts`
- Test: `packages/agent/src/__tests__/metrics.test.ts`

**Key implementation notes:**
- `AgentHarness` is the main orchestrator -- called by Inngest workflow
- `runner.ts` maps harness steps to Inngest step functions (each step is retryable)
- Lifecycle state machine: valid transitions only (draft->paper, paper->paused, paused->paper, paper->retired, paused->retired)
- Drift monitor: track rolling mean + stddev of (action distribution, avg quantity, trade frequency) per agent. Alert if current decision deviates > 2 sigma.
- Retrospective: delayed Inngest step, runs after market close, calls Sonnet with trade outcome data
- Metrics: compute from decisions + orders tables: win rate, total P&L, max drawdown, Sharpe ratio (simplified -- daily returns stddev)

**Tests:**
- Lifecycle rejects invalid transitions (e.g., draft -> retired directly -- actually this is valid per spec, test draft -> paused -> live_auto which is invalid for MVP)
- Lifecycle accepts valid transitions
- Metrics calculation with known inputs produces expected outputs
- Drift detection flags outlier decisions

**Commit:** `feat: add agent harness, lifecycle state machine, and metrics`

---

### Task 2.6: Create packages/signals -- Pipeline and bus

**Files:**
- Create: `packages/signals/package.json`
- Create: `packages/signals/tsconfig.json`
- Create: `packages/signals/src/sources/types.ts`
- Create: `packages/signals/src/sources/alpaca.ts`
- Create: `packages/signals/src/sources/config.ts`
- Create: `packages/signals/src/sources/health.ts`
- Create: `packages/signals/src/pipeline/ingest.ts`
- Create: `packages/signals/src/pipeline/filter.ts`
- Create: `packages/signals/src/pipeline/enrich.ts`
- Create: `packages/signals/src/pipeline/derive.ts`
- Create: `packages/signals/src/pipeline/schedule.ts`
- Create: `packages/signals/src/bus/publisher.ts`
- Create: `packages/signals/src/bus/consumer.ts`
- Create: `packages/signals/src/bus/types.ts`
- Create: `packages/signals/src/feedback/linker.ts`
- Create: `packages/signals/src/index.ts`
- Test: `packages/signals/src/__tests__/filter.test.ts`
- Test: `packages/signals/src/__tests__/derive.test.ts`

**Key implementation notes:**
- Use `@upstash/redis` for Redis Streams operations
- Sources: start with Alpaca market data only for MVP (news sources can be added later)
- Filter: regex ticker extraction, watchlist match via Set lookup, SHA-256 content hash dedup
- Enrich: call Haiku via `@e8e/agent` LLM client, structured output with EnrichmentOutput schema
- Derive: compute sentiment delta (current - previous window avg), velocity (signals per hour)
- Publisher: `XADD` to Redis stream per ticker, set TTL on stream entries
- Consumer: `XRANGE` by ticker + time window, returns sorted signals

**Tests:**
- Filter deduplicates by content hash
- Filter extracts tickers from headlines
- Derive computes correct sentiment delta
- Derive computes correct velocity

**Commit:** `feat: add signal pipeline with enrichment and Redis Streams bus`

---

## Phase 3: API Layer (tRPC + Inngest Workflows)

Wire the backend packages into the Next.js API via tRPC and Inngest.

---

### Task 3.1: Set up tRPC in apps/web

**Files:**
- Modify: `apps/web/package.json` (add tRPC deps)
- Create: `apps/web/src/trpc/context.ts`
- Create: `apps/web/src/trpc/router.ts`
- Create: `apps/web/src/trpc/errors.ts`
- Create: `apps/web/src/trpc/middleware/auth.ts`
- Create: `apps/web/src/trpc/middleware/rateLimit.ts`
- Create: `apps/web/src/trpc/middleware/logger.ts`
- Create: `apps/web/src/app/api/trpc/[trpc]/route.ts`

**Key implementation notes:**
- Install: `@trpc/server`, `@trpc/client`, `@trpc/tanstack-react-query`, `@upstash/ratelimit`
- Context: extract Supabase JWT from Authorization header, verify, inject userId
- Auth middleware: `protectedProcedure` that throws UNAUTHORIZED if no valid session
- Rate limit: per-userId, 100 reads/min, 20 writes/min using Upstash sliding window
- Logger: log procedure name, userId, latency, status (success/error)
- Errors: map Supabase/Alpaca errors to tRPC error codes

**Commit:** `feat: set up tRPC with auth, rate limiting, and error handling`

---

### Task 3.2: Create tRPC routers

**Files:**
- Create: `apps/web/src/trpc/routers/home.ts`
- Create: `apps/web/src/trpc/routers/portfolio.ts`
- Create: `apps/web/src/trpc/routers/agents.ts`
- Create: `apps/web/src/trpc/routers/decisions.ts`
- Create: `apps/web/src/trpc/routers/signals.ts`
- Create: `apps/web/src/trpc/routers/orders.ts`
- Create: `apps/web/src/trpc/routers/onboarding.ts`
- Create: `apps/web/src/trpc/routers/settings.ts`
- Create: `apps/web/src/trpc/routers/admin.ts`
- Modify: `apps/web/src/trpc/router.ts` (merge all sub-routers)

**Key implementation notes:**
- Each router uses query modules from `@e8e/db`
- `home.getHomeScreen`: parallel Supabase queries for portfolio, agents, signals, regime
- `agents.create`: validate via `CreateAgentInput` Zod schema, insert via `@e8e/db`
- `decisions.approve`: update decision status, emit `agent/decision.approved` Inngest event
- `settings.toggleKillSwitch`: update feature_flags table, emit `agent/killswitch.toggled` event
- `onboarding.registerPushToken`: upsert into push_tokens table
- `admin.getUsage`: sum cost_usd from traces table grouped by day

**Commit:** `feat: add tRPC routers for all API endpoints`

---

### Task 3.3: Set up Inngest with agent workflows

**Files:**
- Modify: `apps/web/package.json` (add inngest)
- Create: `apps/web/inngest/client.ts` (Inngest client instance)
- Create: `apps/web/inngest/functions/agent-decision.ts`
- Create: `apps/web/inngest/functions/signal-pipeline.ts`
- Create: `apps/web/inngest/functions/order-reconcile.ts`
- Create: `apps/web/inngest/functions/retrospective.ts`
- Create: `apps/web/inngest/functions/on-failure.ts`
- Create: `apps/web/inngest/index.ts` (export all functions)
- Create: `apps/web/src/app/api/inngest/route.ts` (serve endpoint)

**Key implementation notes:**
- `agent-decision`: triggered by `agent/decision.requested` event or cron. Steps: load agent -> assemble context -> LLM call -> constraint check -> (await approval or auto) -> execute -> persist
- `signal-pipeline`: cron-triggered. Steps: ingest -> filter -> enrich -> derive -> publish
- `order-reconcile`: triggered by `order/fill.received` or periodic poll. Steps: check Alpaca order status -> update orders table -> update positions table
- `retrospective`: triggered after market close for agents with fills today. Steps: gather trade data -> Sonnet reflection -> save to decision
- `on-failure`: global failure handler. Steps: log to routine_logs -> send push notification to user
- All functions use `@e8e/agent`, `@e8e/signals`, `@e8e/broker`, `@e8e/db` packages

**Commit:** `feat: add Inngest workflows for agent decisions, signals, and reconciliation`

---

### Task 3.4: Add webhook endpoints

**Files:**
- Create: `apps/web/src/app/api/webhooks/verify.ts`
- Create: `apps/web/src/app/api/webhooks/alpaca/route.ts`
- Create: `apps/web/src/app/api/webhooks/slack/route.ts`

**Key implementation notes:**
- `verify.ts`: shared HMAC-SHA256 signature verification utility
- Alpaca webhook: receives order fill/cancel events, emits `order/fill.received` Inngest event
- Slack webhook: receives messages from feedback channel, inserts into feedback_items table
- Both verify signatures before processing
- Both return 200 quickly, do work via Inngest events (not inline)

**Commit:** `feat: add webhook endpoints for Alpaca and Slack`

---

## Phase 4: Mobile App Foundation

Build the Expo app shell, design system, and auth flow.

---

### Task 4.1: Initialize Expo app in apps/mobile

**Files:**
- Create: `apps/mobile/` (via `npx create-expo-app`)
- Modify: `apps/mobile/package.json` (add workspace deps)
- Create: `apps/mobile/app/_layout.tsx` (root layout with providers)
- Modify: `apps/mobile/tsconfig.json` (extend base)

**Key implementation notes:**
- Use Expo SDK 52 with expo-router
- Install deps: `expo-router`, `@supabase/supabase-js`, `react-native-mmkv`, `expo-secure-store`, `expo-haptics`, `expo-local-authentication`, `react-native-reanimated`, `moti`, `sentry-expo`
- Root layout: wrap with Supabase auth provider + tRPC provider + MMKV cache provider
- Configure tRPC client pointing to Next.js API URL

**Commit:** `feat: initialize Expo app with providers and navigation`

---

### Task 4.2: Build packages/ui design system

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/tokens/colors.ts`
- Create: `packages/ui/src/tokens/typography.ts`
- Create: `packages/ui/src/tokens/spacing.ts`
- Create: `packages/ui/src/tokens/radii.ts`
- Create: `packages/ui/src/primitives/Text.tsx`
- Create: `packages/ui/src/primitives/Card.tsx`
- Create: `packages/ui/src/primitives/Button.tsx`
- Create: `packages/ui/src/primitives/Pill.tsx`
- Create: `packages/ui/src/primitives/Toggle.tsx`
- Create: `packages/ui/src/primitives/ProgressBar.tsx`
- Create: `packages/ui/src/primitives/Sparkline.tsx`
- Create: `packages/ui/src/primitives/Skeleton.tsx`
- Create: `packages/ui/src/primitives/ErrorBoundary.tsx`
- Create: `packages/ui/src/index.ts`

**Key implementation notes:**
- Tokens extracted directly from design walkthrough CSS variables
- Colors: `bg: '#0f100d'`, `amber: '#d4a25e'`, `teal: '#6fb3a4'`, `rose: '#d97867'`, `sage: '#8ea87c'`
- Typography: Fraunces (serif), Inter Tight (sans), JetBrains Mono (mono) -- loaded via `expo-font`
- Text component: variants prop (serif/sans/mono), size prop, color prop
- Card: surface background, border, configurable radius
- Button: primary (amber bg), secondary (outlined), ghost, destructive (rose)
- All primitives require `accessibilityLabel` prop
- Use React Native primitives (View, Text, Pressable) -- works on mobile + web

**Commit:** `feat: add packages/ui design system with tokens and primitives`

---

### Task 4.3: Build auth flow screens

**Files:**
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/splash.tsx`
- Create: `apps/mobile/app/(auth)/onboarding.tsx`
- Create: `apps/mobile/app/(auth)/questionnaire.tsx`
- Create: `apps/mobile/app/(auth)/broker-connect.tsx`
- Create: `apps/mobile/hooks/useAuth.ts`

**Key implementation notes:**
- Splash: wordmark (folio.e8e), tagline, "Get started" + "Sign in" buttons
- Onboarding: 3-slide value prop carousel with dots indicator
- Questionnaire: multi-step risk profile Q&A (from design walkthrough)
- Broker connect: Alpaca API key input, stored via expo-secure-store
- Auth: Supabase email/password or magic link
- All screens use `@e8e/ui` primitives
- Match the design walkthrough HTML exactly for layout and typography

**Commit:** `feat: add auth and onboarding screens`

---

### Task 4.4: Build tab navigation and screen shells

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx` (Home)
- Create: `apps/mobile/app/(tabs)/agents/index.tsx`
- Create: `apps/mobile/app/(tabs)/agents/[id].tsx`
- Create: `apps/mobile/app/(tabs)/agents/create.tsx`
- Create: `apps/mobile/app/(tabs)/signals.tsx`
- Create: `apps/mobile/app/(tabs)/settings.tsx`
- Create: `apps/mobile/app/decision/[id].tsx`
- Create: `apps/mobile/app/trace/[id].tsx`

**Key implementation notes:**
- 4 tabs: Home, Agents, Signals, Settings -- matching the dock in the design walkthrough
- Tab bar: custom styled with mono font, amber active color
- Each screen starts as a shell (loading skeleton) -- will be filled with components in Phase 5
- Decision and trace screens are modal/stack routes (not tabs)

**Commit:** `feat: add tab navigation and screen shells`

---

## Phase 5: Feature Integration (Screens + Real Data)

Connect mobile screens to tRPC API with real data.

---

### Task 5.1: Home screen with portfolio and agent cards

**Files:**
- Create: `apps/mobile/components/home/PortfolioCard.tsx`
- Create: `apps/mobile/components/home/RegimeBanner.tsx`
- Create: `apps/mobile/components/home/AgentSummaryCard.tsx`
- Create: `apps/mobile/components/home/NewsFeed.tsx`
- Create: `apps/mobile/hooks/usePortfolio.ts`
- Modify: `apps/mobile/app/(tabs)/index.tsx`

**Key implementation notes:**
- PortfolioCard: total value with serif font, delta with profit/loss color, sparkline
- RegimeBanner: market state indicator (pre-market, open, closed)
- AgentSummaryCard: agent name, health dot (pulsing), ticker, recent P&L
- NewsFeed: signal items with sentiment score, headline, source, time
- All data fetched via tRPC `home.getHomeScreen` procedure
- Supabase Realtime subscription for live portfolio updates

**Commit:** `feat: build home screen with portfolio, agents, and signals`

---

### Task 5.2: Agent screens (list, detail, create)

**Files:**
- Create: `apps/mobile/components/agent/AgentDetailHero.tsx`
- Create: `apps/mobile/components/agent/MiniStats.tsx`
- Create: `apps/mobile/components/agent/ActivityBar.tsx`
- Create: `apps/mobile/components/agent/DecisionHistory.tsx`
- Create: `apps/mobile/hooks/useAgents.ts`
- Modify: `apps/mobile/app/(tabs)/agents/index.tsx`
- Modify: `apps/mobile/app/(tabs)/agents/[id].tsx`
- Modify: `apps/mobile/app/(tabs)/agents/create.tsx`

**Key implementation notes:**
- Agent list: cards with health indicator, ticker, mode badge
- Agent detail: hero card with name + stats, activity bar (decision history), scrollable decision list
- Agent create: step-by-step wizard -- pick ticker, set strategy, configure risk profile + position size
- MiniStats: win rate, total P&L, Sharpe -- computed via tRPC `agents.getMetrics`
- ActivityBar: visual bar chart of recent decisions (active/pending/idle)

**Commit:** `feat: build agent list, detail, and creation screens`

---

### Task 5.3: Decision approval flow

**Files:**
- Create: `apps/mobile/components/decision/DecisionHero.tsx`
- Create: `apps/mobile/components/decision/ConstraintChips.tsx`
- Create: `apps/mobile/components/decision/ReasoningQuote.tsx`
- Create: `apps/mobile/components/decision/ApproveReject.tsx`
- Create: `apps/mobile/hooks/useDecisions.ts`
- Modify: `apps/mobile/app/decision/[id].tsx`

**Key implementation notes:**
- DecisionHero: trade proposal card with action, ticker, quantity, current price
- ConstraintChips: show which constraint layers passed (checkmark per chip)
- ReasoningQuote: agent's reasoning in italic serif with quote mark
- ApproveReject: two buttons -- approve (amber) and reject (secondary). Haptic feedback on tap.
- Biometric gate before approve (if enabled in settings)
- On approve: tRPC `decisions.approve` mutation -> optimistic update -> Inngest executes trade
- On reject: tRPC `decisions.reject` mutation with optional reason

**Commit:** `feat: build decision approval flow with haptics and biometric gate`

---

### Task 5.4: Signal feed and trace view

**Files:**
- Create: `apps/mobile/hooks/useSignals.ts`
- Modify: `apps/mobile/app/(tabs)/signals.tsx`
- Create: `apps/mobile/components/retro/RetroHero.tsx`
- Create: `apps/mobile/components/retro/RetroTimeline.tsx`
- Create: `apps/mobile/components/retro/RetroLesson.tsx`
- Modify: `apps/mobile/app/trace/[id].tsx`

**Key implementation notes:**
- Signal feed: scrollable list of enriched signals with sentiment score, headline, source, materiality badge
- Filter by ticker or "all watched"
- Trace view: step-by-step trace of a decision -- context assembled, LLM called, constraints checked, outcome
- Uses the trace-step vertical timeline layout from the design walkthrough
- Retrospective components show P&L outcome, trade timeline, agent's learned lesson

**Commit:** `feat: build signal feed, trace view, and retrospective screens`

---

### Task 5.5: Settings and kill switch

**Files:**
- Create: `apps/mobile/hooks/useBiometricGate.ts`
- Modify: `apps/mobile/app/(tabs)/settings.tsx`

**Key implementation notes:**
- Settings groups: Account, Agent Defaults, Security, Notifications
- Kill switch: prominent destructive button. Biometric gate required. Heavy haptic on confirm.
- When toggled: tRPC `settings.toggleKillSwitch` -> Inngest halts all agent workflows immediately
- Kill switch confirmation screen matches design walkthrough (rose theme, checklist of what will happen)
- Toggle for push notifications, biometric auth, approval timeout slider

**Commit:** `feat: build settings screen with kill switch`

---

## Phase 6: Push Notifications + Offline

---

### Task 6.1: Push notification system

**Files:**
- Create: `apps/mobile/app/+notifications.ts`
- Create: `apps/mobile/hooks/usePushNotifications.ts`
- Create: `supabase/functions/send-push/index.ts` (Supabase Edge Function)

**Key implementation notes:**
- Register for Expo push tokens on app launch, save via tRPC `onboarding.registerPushToken`
- `+notifications.ts`: Expo Router notification handler -- routes `decision_id` to `decision/[id]`
- Supabase Edge Function: receives Inngest `notification/push.send` event, calls Expo Push API
- Lock screen notification: shows agent name, trade summary, approve/review buttons (from design walkthrough)

**Commit:** `feat: add push notification system with deep linking`

---

### Task 6.2: Offline support and Realtime

**Files:**
- Create: `apps/mobile/hooks/useNetworkState.ts`
- Create: `apps/mobile/hooks/useCachedState.ts`
- Create: `apps/mobile/hooks/useRealtimeChannel.ts`

**Key implementation notes:**
- MMKV cache: persist last portfolio state, agent list, recent signals
- Network state hook: detect connectivity, show "last updated X ago" badge on stale data
- Realtime hook: wraps Supabase channel subscription with auto-reconnect + exponential backoff
- On reconnect: refetch full state to avoid stale data
- Graceful degradation: all screens render with cached data when offline

**Commit:** `feat: add offline support with MMKV cache and Realtime reconnection`

---

## Phase 7: CI/CD and Deploy

---

### Task 7.1: GitHub Actions CI pipeline

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/mobile-build.yml`

**Key implementation notes:**
- CI: on PR -> pnpm install -> turbo typecheck -> turbo lint -> turbo test -> Vercel preview
- Mobile build: on release tag -> EAS Build (iOS + Android) -> EAS Submit to TestFlight
- Use pnpm caching in CI for speed
- Run migrations check: `supabase db diff` if migrations/ changed

**Commit:** `chore: add GitHub Actions CI and mobile build pipelines`

---

### Task 7.2: Production deploy checklist

**Files:**
- Create: `docs/runbooks/local-dev-setup.md`
- Create: `docs/runbooks/secret-rotation.md`
- Create: `docs/runbooks/database-migrations.md`

**Key implementation notes:**
- Local dev setup: prerequisites, env vars, `pnpm dev` command, how to test each component
- Secret rotation: step-by-step for Alpaca, Supabase, Anthropic API keys
- Database migrations: how to create, test locally, apply to production safely

**Commit:** `docs: add operational runbooks`

---

## Phase Summary

| Phase | Tasks | What it enables |
|-------|-------|----------------|
| 1. Foundation | 1.1-1.5 | Monorepo builds, types compile, DB exists |
| 2. Backend | 2.1-2.6 | Agent can think, decide, trade, ingest signals |
| 3. API Layer | 3.1-3.4 | Mobile can talk to backend via type-safe API |
| 4. Mobile Foundation | 4.1-4.4 | App runs, navigates, authenticates |
| 5. Feature Integration | 5.1-5.5 | Full user experience with real data |
| 6. Push + Offline | 6.1-6.2 | Trade approval from lock screen, works offline |
| 7. CI/CD | 7.1-7.2 | Automated testing, builds, deploys |

**Total: 24 tasks across 7 phases**

Each phase is independently deployable and testable. Phase 1 must complete before anything else. Phases 2 and 4 can run in parallel (backend vs mobile). Phases 3 and 5 integrate them. Phases 6 and 7 polish and ship.
