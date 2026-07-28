'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '@/lib/auth-types';
import { loginWithGoogle, logoutWeb3Auth, warmupWeb3Auth } from '@/lib/web3auth-login';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);
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
    warmupWeb3Auth();
  }, []);

  useEffect(() => {
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
  }, []);

  const login = useCallback(async () => {
    if (loginBusy) return;
    setLoginBusy(true);
    setLoginError(null);
    try {
      const nextUser = await loginWithGoogle();
      setUser(nextUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed';
      if (!/user closed|closed popup|user rejected/i.test(message)) {
        setLoginError(message);
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
