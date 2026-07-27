import { Suspense } from 'react';
import OnchainAdminLoginForm from './OnchainAdminLoginForm';

export default function OnchainAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-10 text-sm text-slate-400">Loading…</main>
      }
    >
      <OnchainAdminLoginForm />
    </Suspense>
  );
}
