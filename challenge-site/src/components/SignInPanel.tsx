'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

type SignInPanelProps = {
  googleLabel?: string;
  emailLabel?: string;
  className?: string;
};

export default function SignInPanel({
  googleLabel = 'Continue with Google',
  emailLabel = 'Continue with email',
  className = '',
}: SignInPanelProps) {
  const { login, loginEmail, loginBusy, loginError } = useAuth();
  const [email, setEmail] = useState('');

  return (
    <div className={className}>
      {loginError ? (
        <p className="mb-4 rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {loginError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={loginBusy}
        onClick={() => {
          void login().catch(() => {
            // loginError set in auth context
          });
        }}
        className="flex w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
      >
        {loginBusy ? 'Signing in…' : googleLabel}
      </button>

      <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-500">
        <span className="h-px flex-1 bg-slate-700" />
        or
        <span className="h-px flex-1 bg-slate-700" />
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void loginEmail(email).catch(() => {
            // loginError set in auth context
          });
        }}
      >
        <label htmlFor="dp-signin-email" className="block text-sm text-slate-300">
          Email
        </label>
        <input
          id="dp-signin-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          disabled={loginBusy}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loginBusy}
          className="flex w-full items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-60"
        >
          {loginBusy ? 'Signing in…' : emailLabel}
        </button>
      </form>
    </div>
  );
}
