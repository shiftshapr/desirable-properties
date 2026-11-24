import type { Metadata } from 'next';
import Link from 'next/link';
import AccountParticipation from '@/components/account/AccountParticipation';
import AccountPhoneSettings from '@/components/account/AccountPhoneSettings';
import { phoneOptinEnabled } from '@/lib/phone-optin/flag';
import { govhubUrl } from '@/lib/govhub';

/** Account settings: ballot participation (always), and the phone setting while PHONE_OPTIN is on. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Account – Desirable Properties',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  const phone = phoneOptinEnabled();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold text-white">Account</h1>
      <p className="mt-3 text-sm text-slate-400">
        Your name, picture and bio are on your{' '}
        <a href={govhubUrl('/profile/edit/')} className="text-cyan-300 hover:text-cyan-200" target="_blank" rel="noopener noreferrer">
          profile
        </a>
        .
        {phone ? (
          <>
            {' '}How text alerts work: <Link href="/text-alerts" className="text-cyan-300 hover:text-cyan-200">text alerts</Link>.
          </>
        ) : null}
      </p>
      <div className="mt-8 space-y-8">
        <AccountParticipation />
        {phone ? <AccountPhoneSettings /> : null}
      </div>
    </main>
  );
}
