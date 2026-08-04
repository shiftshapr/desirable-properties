'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatAuthError, isUserDismissedAuthError } from '@/lib/auth-errors';

export type AdminAuthState =
  | 'loading'
  | 'needs-sign-in'
  | 'signing-in'
  | 'ok'
  | 'forbidden';

async function verifyAdminAccess(): Promise<'ok' | 'forbidden' | 'unauthorized'> {
  const res = await fetch('/api/admin/me', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) return 'unauthorized';
  if (res.status === 403 || !res.ok || !data.ok) return 'forbidden';
  return 'ok';
}

/** Gate admin UI: 401 shows sign-in prompt; login() only on explicit user click (Safari popup policy). */
export function useAdminAuthGate() {
  const { checked, login, refresh } = useAuth();
  const [authState, setAuthState] = useState<AdminAuthState>('loading');
  const [error, setError] = useState<string | null>(null);

  const promptSignIn = useCallback(async () => {
    setAuthState('signing-in');
    setError(null);
    try {
      await login();
      await refresh();
      const after = await verifyAdminAccess();
      if (after === 'ok') {
        setAuthState('ok');
        return;
      }
      if (after === 'forbidden') {
        setAuthState('forbidden');
        return;
      }
      setAuthState('needs-sign-in');
      setError('Sign-in completed but admin access was not granted. Try another account.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      if (!isUserDismissedAuthError(message)) {
        setError(formatAuthError(message));
      }
      setAuthState('needs-sign-in');
    }
  }, [login, refresh]);

  const checkAccess = useCallback(async () => {
    setError(null);
    try {
      const result = await verifyAdminAccess();
      if (result === 'ok') {
        setAuthState('ok');
        return;
      }
      if (result === 'forbidden') {
        setAuthState('forbidden');
        return;
      }
      setAuthState('needs-sign-in');
    } catch {
      setError('Could not verify admin session.');
      setAuthState('needs-sign-in');
    }
  }, []);

  useEffect(() => {
    if (!checked) return;
    void checkAccess();
  }, [checked, checkAccess]);

  return { authState, error, retry: promptSignIn };
}
