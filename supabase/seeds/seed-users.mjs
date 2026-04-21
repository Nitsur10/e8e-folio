#!/usr/bin/env node
/**
 * folio.e8e — user-scoped seed data.
 *
 * Creates 10 test auth users + their profiles, plus a handful of decisions,
 * memory rows, watchlist entries, and traces so RLS can be exercised.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/seeds/seed-users.mjs
 */
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TICKERS = ['SYN001', 'SYN042', 'SYN123', 'SYN200', 'SYN300'];
const TIERS = ['learner', 'standard', 'active', 'pro'];
const RISKS = ['conservative', 'moderate', 'aggressive'];

async function main() {
  const createdUsers = [];

  for (let i = 1; i <= 10; i++) {
    const email = `seed.user${i}@folio-e8e.test`;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'seed-password-change-me',
      email_confirm: true,
    });
    if (error && !String(error.message).includes('already been registered')) {
      throw error;
    }
    const userId = data?.user?.id ?? (await findUserIdByEmail(email));
    if (!userId) {
      throw new Error(`Could not resolve user id for ${email}`);
    }

    await supabase.from('users_profile').upsert({
      user_id: userId,
      display_name: `Seed user ${i}`,
      capital_tier: TIERS[i % TIERS.length],
      risk_tolerance: RISKS[i % RISKS.length],
      approval_mode: 'ask_me',
    });

    for (const ticker of TICKERS.slice(0, (i % TICKERS.length) + 1)) {
      await supabase.from('watchlist').upsert({ user_id: userId, ticker });
    }

    const { data: decision } = await supabase
      .from('decisions')
      .insert({
        user_id: userId,
        ticker: TICKERS[i % TICKERS.length],
        query_type: 'advisor_query',
        agent_output: { seeded: true },
        user_action: i % 2 === 0 ? 'approved' : 'saved',
      })
      .select('id')
      .single();

    if (decision?.id) {
      await supabase.from('user_memory').insert({
        user_id: userId,
        ticker: TICKERS[i % TICKERS.length],
        memory_type: 'note',
        content: { text: `Seed memory for user ${i}` },
        decision_id: decision.id,
      });
    }

    createdUsers.push({ email, userId });
  }

  console.log(`Seeded ${createdUsers.length} users.`);
}

async function findUserIdByEmail(email) {
  const { data } = await supabase.auth.admin.listUsers();
  return data?.users?.find((u) => u.email === email)?.id ?? null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
