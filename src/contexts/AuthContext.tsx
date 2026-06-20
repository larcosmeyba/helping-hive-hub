import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAppUrl } from "@/lib/appUrl";
import { phIdentify, phReset, phOptIn, phOptOut } from "@/lib/posthog";
import { sentrySetUser } from "@/lib/sentry";

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
  refreshProfile: () => Promise<void>;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Identify into PostHog + Sentry on sign-in; reset on sign-out.
      if (session?.user) {
        // Note: meaningful identify (tier/zip3/etc.) happens once the
        // profile loads in the effect below — no empty-props call here.
        sentrySetUser({ id: session.user.id });
      } else if (event === "SIGNED_OUT") {
        phReset();
        sentrySetUser(null);
      }
      // Only flip loading off after initial session check has completed
      if (initialized) setLoading(false);
    });

    // THEN check existing session — this completes auth bootstrap.
    // Always release the loading lock, even if the network call rejects
    // (cold-start with no connectivity), otherwise <ProtectedRoute>
    // would spin forever.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.warn("[Auth] getSession failed:", err);
      })
      .finally(() => {
        initialized = true;
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error) {
      setProfile((data as ProfileLite | null) ?? null);
    }
  }, [user]);

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
          const p = data as ProfileLite;
          setProfile(p);
          // Apply analytics opt-out + identify person properties.
          if (p.analytics_opt_in === false) phOptOut();
          else {
            phOptIn();
            // Coarsen ZIP to first 3 digits (ZIP3) — standard de-identification.
            // Per privacy policy, no full ZIP is sent to PostHog.
            const zip3 = p.zip_code ? String(p.zip_code).replace(/\D/g, "").slice(0, 3) || undefined : undefined;
            phIdentify(user.id, {
              tier: p.tier ?? undefined,
              zip3,
              household_size: p.household_size ?? undefined,
              snap_status: p.snap_status ?? undefined,
            });
          }
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
        // Always route to the web /auth/confirm landing page. That page
        // completes verification on the web AND offers a deep-link button
        // (com.helpthehive://auth/confirm) to bounce native-app users back
        // into the installed app with their session tokens.
        emailRedirectTo: `${getAppUrl()}/auth/confirm`,
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
    // Reset analytics + error monitoring user state.
    phReset();
    sentrySetUser(null);
    // Clear all user-scoped client state so a subsequent user on the same
    // device cannot see the previous user's cached data.
    setProfile(null);
    setUser(null);
    setSession(null);
    // localStorage keys cleared on sign-out:
    //   - hive_meal_plan          (cached weekly meal plan from MealPlanContext)
    //   - hth_onboarding_progress (questionnaire progress, also stored in DB)
    //   - hth_location_asked      (location prompt flag from LocationContext)
    //   - hth_location_coords     (legacy plaintext coords, defensive cleanup)
    //   - hth_show_macros         (per-user macro display preference)
    try {
      localStorage.removeItem("hive_meal_plan");
      localStorage.removeItem("hth_onboarding_progress");
      localStorage.removeItem("hth_location_asked");
      localStorage.removeItem("hth_location_coords");
      localStorage.removeItem("hth_show_macros");
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, refreshProfile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
