import Link from 'next/link';
import LegalArticle from '@/components/LegalArticle';
import { oarsDpHtml, privacyBodyHtml } from '@/lib/interim-legal';

export const metadata = {
  title: 'Privacy Policy – Desirable Properties',
  description:
    'Interim privacy policy for Desirable Properties and related Bridgit DAO sites. Not attorney-approved.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Back to home
      </Link>
      <article className="mt-8">
        <LegalArticle html={privacyBodyHtml()} />
        <div className="mt-12 border-t border-slate-800 pt-8">
          <LegalArticle html={oarsDpHtml()} />
        </div>
        <p className="mt-8 text-sm text-slate-500">
          Also see our <Link href="/terms">Terms of Use</Link>.
        </p>
      </article>
    </main>
  );
}
