'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '@/lib/auth-types';
import { formatAuthError, isUserDismissedAuthError } from '@/lib/auth-errors';
import {
  clearStaleWeb3AuthClientState,
  loginWithGoogle,
  logoutWeb3Auth,
  warmupWeb3Auth,
} from '@/lib/web3auth-login';

type AuthContextValue = {
  user: AuthUser | null;
  checked: boolean;
  loginBusy: boolean;
  loginError: string | null;
  setUser: (user: AuthUser | null) => void;
  login: () => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialChecked?: boolean;
};

export function AuthProvider({
  children,
  initialUser = null,
  initialChecked = false,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [checked, setChecked] = useState(initialChecked);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      setUser(data.authenticated && data.user ? data.user : null);
    } catch {
      setUser(null);
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    if (initialUser) {
      warmupWeb3Auth();
      return;
    }
    clearStaleWeb3AuthClientState();
  }, [initialUser]);

  useEffect(() => {
    if (initialChecked) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (!cancelled) {
          setUser(data.authenticated && data.user ? data.user : null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialChecked]);

  const login = useCallback(async () => {
    if (loginBusy) return;
    setLoginBusy(true);
    setLoginError(null);
    try {
      const nextUser = await loginWithGoogle();
      setUser(nextUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed';
      if (!isUserDismissedAuthError(message)) {
        setLoginError(formatAuthError(message));
      }
      throw error;
    } finally {
      setLoginBusy(false);
    }
  }, [loginBusy]);

  const logout = useCallback(async () => {
    await logoutWeb3Auth();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, checked, loginBusy, loginError, setUser, login, refresh, logout }),
    [user, checked, loginBusy, loginError, login, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
