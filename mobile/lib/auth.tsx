import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

type AuthState = {
  session: Session | null;
  loading: boolean;
  mfaRequired: boolean;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  mfaRequired: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    let unmounted = false;
    let supabase: ReturnType<typeof getSupabase>;
    try {
      supabase = getSupabase();
    } catch {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (unmounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (unmounted) return;
      setSession(nextSession);
      if (nextSession) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        setMfaRequired(Boolean(aal?.nextLevel && aal.nextLevel !== aal.currentLevel));
      } else {
        setMfaRequired(false);
      }
      if (event === 'INITIAL_SESSION') setLoading(false);
    });

    return () => {
      unmounted = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, loading, mfaRequired }), [session, loading, mfaRequired]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
