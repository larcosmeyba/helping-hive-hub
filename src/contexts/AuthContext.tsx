import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAppUrl } from "@/lib/appUrl";

interface ProfileLite {
  user_id: string;
  display_name: string | null;
  zip_code: string | null;
  weekly_budget: number | null;
  household_size: number | null;
  questionnaire_completed: boolean | null;
  home_store?: string | null;
  tier?: string | null;
  snap_status?: boolean | null;
  food_assistance_status?: string | null;
  monthly_snap_amount?: number | null;
  snap_deposit_day?: number | null;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileLite | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileLite | null>(null);

  useEffect(() => {
    let initialized = false;

    // Set up listener FIRST (synchronous registration)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Only flip loading off after initial session check has completed
      if (initialized) setLoading(false);
    });

    // THEN check existing session — this completes auth bootstrap
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      initialized = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile once per logged-in user — shared across the app to avoid duplicate calls
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    // L3: retry with exponential backoff on transient failures so a single
    // network hiccup doesn't leave the user with a null profile for the session.
    const fetchProfile = async () => {
      const delays = [0, 500, 1500, 4000];
      for (let i = 0; i < delays.length; i++) {
        if (cancelled) return;
        if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data) {
          setProfile(data as ProfileLite);
          return;
        }
        if (!error) return; // no row, no point retrying
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: getAppUrl(),
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
