import Link from 'next/link';
import LegalArticle from '@/components/LegalArticle';
import { oarsDpHtml, termsBodyHtml } from '@/lib/interim-legal';

export const metadata = {
  title: 'Terms of Use – Desirable Properties',
  description:
    'Interim terms of use for Desirable Properties and related Bridgit DAO sites. Not attorney-approved.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Back to home
      </Link>
      <article className="mt-8">
        <LegalArticle html={termsBodyHtml()} />
        <div className="mt-12 border-t border-slate-800 pt-8">
          <LegalArticle html={oarsDpHtml()} />
        </div>
        <p className="mt-8 text-sm text-slate-500">
          Also see our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </article>
    </main>
  );
}
