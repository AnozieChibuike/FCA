import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { PROFILE_COLUMNS } from './api';
import type { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata: Record<string, unknown>) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isArbiter: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedFor = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    let { data } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
    if (!data) {
      // The signup trigger creates the profile; give it a moment, then create a minimal one as a safety net.
      await new Promise((r) => setTimeout(r, 800));
      ({ data } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle());
      if (!data) {
        const { data: auth } = await supabase.auth.getUser();
        const meta = auth.user?.user_metadata ?? {};
        await supabase.from('profiles').insert({
          id: userId,
          full_name: meta.full_name || auth.user?.email?.split('@')[0] || 'Member',
          reg_number: meta.reg_number || 'N/A',
          department: meta.department || 'N/A',
          faculty: meta.faculty || 'N/A',
        });
        ({ data } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle());
      }
    }
    setProfile((data as Profile | null) ?? null);
    loadedFor.current = userId;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password');
      if (!next?.user) {
        setProfile(null);
        loadedFor.current = null;
        setLoading(false);
        return;
      }
      if (loadedFor.current !== next.user.id) {
        // Defer out of the auth callback (supabase-js recommends not awaiting inside it).
        setTimeout(() => fetchProfile(next.user.id).finally(() => setLoading(false)), 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, navigate]);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error && data.user) await fetchProfile(data.user.id);
    return { error };
  }

  async function signUp(email: string, password: string, metadata: Record<string, unknown>) {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: metadata } });
    if (error) return { error };
    if (data.session) {
      setSession(data.session);
      setUser(data.session.user);
      await fetchProfile(data.session.user.id);
      return { error: null };
    }
    // Email confirmation is auto-approved server-side; sign straight in.
    return signIn(email, password);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    loadedFor.current = null;
  }

  const isAdmin = profile?.is_admin ?? false;
  const isArbiter = profile?.is_arbiter ?? false;

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, signIn, signUp, signOut, refreshProfile,
      isAdmin, isArbiter, isStaff: isAdmin || isArbiter,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
