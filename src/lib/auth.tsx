import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;
      if (currentUser) {
        const meta = currentUser.user_metadata || {};
        const fallbackFcaId = meta.fca_id || `FCA-${userId.substring(0, 8).toUpperCase()}`;
        const newProfile = {
          id: userId,
          fca_id: fallbackFcaId,
          full_name: meta.full_name || currentUser.email?.split('@')[0] || 'Member',
          reg_number: meta.reg_number || 'N/A',
          department: meta.department || 'N/A',
          faculty: meta.faculty || 'N/A',
          phone: meta.phone || null,
          status: meta.status || 'PENDING',
          is_admin: meta.is_admin === true || meta.is_admin === 'true',
          is_arbiter: meta.is_arbiter === true || meta.is_arbiter === 'true',
        };
        const { data: created } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select('*')
          .maybeSingle();
        setProfile(created || (newProfile as unknown as Profile));
      } else {
        setProfile(null);
      }
    }
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string, metadata: Record<string, unknown>) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) return { error };

    // Auto-login after signup (email is auto-confirmed via DB trigger)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    return { error: signInError };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      isAdmin: profile?.is_admin ?? false,
      isArbiter: profile?.is_arbiter ?? false,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
