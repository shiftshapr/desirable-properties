'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export type AdminAuthState = 'loading' | 'signing-in' | 'ok' | 'forbidden';

async function verifyAdminAccess(): Promise<'ok' | 'forbidden' | 'unauthorized'> {
  const res = await fetch('/api/admin/me', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) return 'unauthorized';
  if (res.status === 403 || !res.ok || !data.ok) return 'forbidden';
  return 'ok';
}

/** Gate admin UI: 401 opens Web3Auth modal on-page (no /login redirect). */
export function useAdminAuthGate() {
  const { checked, login, refresh } = useAuth();
  const [authState, setAuthState] = useState<AdminAuthState>('loading');
  const [error, setError] = useState<string | null>(null);
  const promptRef = useRef(false);

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
      setAuthState('signing-in');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      if (!/user closed|closed popup|user rejected/i.test(message)) {
        setError(message);
      }
      setAuthState('signing-in');
    }
  }, [login, refresh]);

  const checkAccess = useCallback(async () => {
    setError(null);
    try {
      const result = await verifyAdminAccess();
      if (result === 'ok') {
        setAuthState('ok');
        promptRef.current = false;
        return;
      }
      if (result === 'forbidden') {
        setAuthState('forbidden');
        return;
      }
      if (!promptRef.current) {
        promptRef.current = true;
        await promptSignIn();
      }
    } catch {
      setError('Could not verify admin session.');
      setAuthState('signing-in');
    }
  }, [promptSignIn]);

  useEffect(() => {
    if (!checked) return;
    void checkAccess();
  }, [checked, checkAccess]);

  return { authState, error, retry: promptSignIn };
}
