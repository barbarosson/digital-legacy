"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "./types";

type SocialAuthValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (
    patch: Partial<Pick<Profile, "display_name" | "bio" | "avatar_url">>,
  ) => Promise<{ error: string | null }>;
};

const SocialAuthContext = createContext<SocialAuthValue | null>(null);

export function SocialAuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from("dm_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession?.user) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signUp = useCallback<SocialAuthValue["signUp"]>(
    async (email, password, displayName) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "unconfigured", needsConfirm: false };
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) return { error: error.message, needsConfirm: false };
      const needsConfirm = !data.session;
      return { error: null, needsConfirm };
    },
    [],
  );

  const signIn = useCallback<SocialAuthValue["signIn"]>(
    async (email, password) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "unconfigured" };
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const updateProfile = useCallback<SocialAuthValue["updateProfile"]>(
    async (patch) => {
      const supabase = getSupabase();
      if (!supabase || !session?.user) return { error: "unauthenticated" };
      const { error } = await supabase
        .from("dm_profiles")
        .update(patch)
        .eq("id", session.user.id);
      if (error) return { error: error.message };
      await loadProfile(session.user.id);
      return { error: null };
    },
    [session, loadProfile],
  );

  const value = useMemo<SocialAuthValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
    }),
    [
      configured,
      loading,
      session,
      profile,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      updateProfile,
    ],
  );

  return (
    <SocialAuthContext.Provider value={value}>
      {children}
    </SocialAuthContext.Provider>
  );
}

export function useSocialAuth() {
  const ctx = useContext(SocialAuthContext);
  if (!ctx) {
    throw new Error("useSocialAuth must be used within SocialAuthProvider");
  }
  return ctx;
}
