import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AccountPhoneSettings from '@/components/account/AccountPhoneSettings';
import { phoneOptinEnabled } from '@/lib/phone-optin/flag';
import { govhubUrl } from '@/lib/govhub';

/** Account settings. Today it holds only the phone setting, so the page is a 404 while PHONE_OPTIN is off. */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  if (!phoneOptinEnabled()) return { title: 'Not found', robots: { index: false, follow: false } };
  return {
    title: 'Account – Desirable Properties',
    robots: { index: false, follow: false },
  };
}

export default function AccountPage() {
  if (!phoneOptinEnabled()) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-white">Account</h1>
      <p className="mt-3 text-sm text-slate-400">
        Your name, picture and bio are on your{' '}
        <a href={govhubUrl('/profile/edit/')} className="text-cyan-300 hover:text-cyan-200" target="_blank" rel="noopener noreferrer">
          profile
        </a>
        . How text alerts work: <Link href="/text-alerts" className="text-cyan-300 hover:text-cyan-200">text alerts</Link>.
      </p>
      <div className="mt-8">
        <AccountPhoneSettings />
      </div>
    </main>
  );
}
