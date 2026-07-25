'use client';

import { useCallback, useRef, useState } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  verifierId: string;
  profileImage?: string | null;
}

interface Web3AuthLoginProps {
  onAuthenticated: (user: AuthUser) => void;
  compact?: boolean;
}

declare global {
  interface Window {
    Modal?: {
      Web3Auth: new (config: Record<string, unknown>) => Web3AuthInstance;
      WALLET_CONNECTORS?: { AUTH: string };
    };
  }
}

type Web3AuthInstance = {
  init: () => Promise<void>;
  connectTo: (connector: string, opts?: Record<string, unknown>) => Promise<unknown>;
  getIdentityToken: () => Promise<{ idToken?: string }>;
};

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export default function Web3AuthLogin({ onAuthenticated, compact = false }: Web3AuthLoginProps) {
  const web3authRef = useRef<Web3AuthInstance | null>(null);
  const initRef = useRef<Promise<Web3AuthInstance> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureWeb3Auth = useCallback(async () => {
    if (web3authRef.current) return web3authRef.current;
    if (initRef.current) return initRef.current;

    initRef.current = (async () => {
      const cfgRes = await fetch('/api/auth/web3auth/config');
      if (!cfgRes.ok) throw new Error('Web3Auth config unavailable');
      const cfg = await cfgRes.json();

      await loadScript('https://unpkg.com/@web3auth/modal@10.13.1/dist/modal.umd.min.js');

      await new Promise<void>((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          if (window.Modal?.Web3Auth) resolve();
          else if (Date.now() - start > 10000) reject(new Error('Web3Auth load timeout'));
          else setTimeout(tick, 100);
        };
        tick();
      });

      const Web3Auth = window.Modal!.Web3Auth;
      const instance = new Web3Auth({
        clientId: cfg.clientId,
        web3AuthNetwork: cfg.web3AuthNetwork,
        uiConfig: {
          mode: 'dark',
          theme: { primary: '#0891b2' },
          loginMethodsOrder: ['google', 'email_passwordless'],
        },
        loginConfig: {
          google: {
            verifier: cfg.googleVerifier,
            typeOfLogin: 'google',
            clientId: cfg.clientId,
          },
        },
      });

      await instance.init();
      web3authRef.current = instance;
      return instance;
    })();

    return initRef.current;
  }, []);

  const finishLogin = async (idToken: string) => {
    const res = await fetch('/api/auth/web3auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign-in failed');
    onAuthenticated(data.user);
  };

  const loginGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const web3auth = await ensureWeb3Auth();
      const authConnector = window.Modal?.WALLET_CONNECTORS?.AUTH || 'auth';
      await web3auth.connectTo(authConnector, { authConnection: 'google' });
      const identity = await web3auth.getIdentityToken();
      const idToken = identity?.idToken;
      if (!idToken) throw new Error('No identity token from Web3Auth');
      await finishLogin(idToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const loginEmail = async () => {
    const email = window.prompt('Enter your email for passwordless sign-in:');
    if (!email?.includes('@')) return;

    setBusy(true);
    setError(null);
    try {
      const web3auth = await ensureWeb3Auth();
      const authConnector = window.Modal?.WALLET_CONNECTORS?.AUTH || 'auth';
      const hint = email.trim().toLowerCase();
      await web3auth.connectTo(authConnector, {
        authConnection: 'email_passwordless',
        extraLoginOptions: { login_hint: hint },
        loginHint: hint,
      });
      const identity = await web3auth.getIdentityToken();
      const idToken = identity?.idToken;
      if (!idToken) throw new Error('No identity token from Web3Auth');
      await finishLogin(idToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className="text-xs text-slate-400">
        Sign in with the same Web3Auth account as Gov Hub for saved threads and Gov Hub submissions.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={loginGoogle}
          disabled={busy}
          className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
        <button
          type="button"
          onClick={loginEmail}
          disabled={busy}
          className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-cyan-600 disabled:opacity-50"
        >
          Email
        </button>
      </div>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
