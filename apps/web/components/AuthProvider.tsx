"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { SignInModal } from "./SignInModal";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  /** Backend-authorized admin (Supabase app_metadata.is_admin / role === "admin"). */
  isAdmin: boolean;
  signOut: () => Promise<void>;
  openSignIn: () => void;
  closeSignIn: () => void;
  /**
   * Runs `action` when signed in; otherwise opens the sign-in modal and returns
   * false. Use to gate authenticated-only actions (copy, MCP connect).
   */
  requireAuth: (action?: () => void) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isAdminUser(user: User | null): boolean {
  const meta = user?.app_metadata ?? {};
  return Boolean(meta.is_admin === true || meta.role === "admin");
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    name: (meta.full_name as string) ?? (meta.name as string) ?? null,
    avatarUrl:
      (meta.custom_avatar_url as string) ??
      (meta.avatar_url as string) ??
      (meta.picture as string) ??
      null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      // A stale session (e.g. the user was deleted server-side → "User from sub
      // claim in JWT does not exist") returns an error. Clear it locally so the
      // app drops back to signed-out instead of a broken logged-in state.
      if (error) {
        void supabase.auth.signOut({ scope: "local" });
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setUser(toAuthUser(data.user));
      setIsAdmin(isAdminUser(data.user));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user ?? null));
      setIsAdmin(isAdminUser(session?.user ?? null));
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Dismiss the modal as soon as a session lands (e.g. magic-link return).
  useEffect(() => {
    if (user) setSignInOpen(false);
  }, [user]);

  const openSignIn = useCallback(() => setSignInOpen(true), []);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (user) {
        action?.();
        return true;
      }
      setSignInOpen(true);
      return false;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin,
      openSignIn,
      closeSignIn,
      requireAuth,
      signOut: async () => {
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
        router.refresh();
      },
    }),
    [user, loading, isAdmin, openSignIn, closeSignIn, requireAuth, supabase, router],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SignInModal open={signInOpen} onClose={closeSignIn} />
    </AuthContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useUser must be used within <AuthProvider>");
  return ctx;
}

/** Non-throwing variant for shared utilities that may render outside the provider. */
export function useOptionalAuth() {
  return useContext(AuthContext);
}
