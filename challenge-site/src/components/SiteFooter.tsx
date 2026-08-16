import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import { bookDiscussHref, GOVHUB_DP_PATCHES_URL } from '@/lib/govhub';
import { WORKGROUPS_LIST_HREF, WORKGROUPS_SIGNUPS_HREF } from '@/lib/routes';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Desirable Properties Challenge · Meta-Layer Initiative</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href={WORKGROUPS_LIST_HREF} className="text-cyan-300 hover:text-cyan-200">
            Workgroups
          </Link>
          <Link href={WORKGROUPS_SIGNUPS_HREF} className="text-slate-400 hover:text-slate-200">
            Signups
          </Link>
          <DiscussPatchLink
            href={bookDiscussHref()}
            className="text-cyan-300 hover:text-cyan-200"
          >
            Discuss &amp; Patch
          </DiscussPatchLink>
          <a
            href={GOVHUB_DP_PATCHES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200"
          >
            Patch on Gov Hub
          </a>
          <Link href="/participate" className="text-slate-400 hover:text-slate-200">
            Participate
          </Link>
          <Link href="/challenge" className="text-slate-400 hover:text-slate-200">
            Challenge
          </Link>
          <Link href="/badges" className="text-slate-400 hover:text-slate-200">
            Badges
          </Link>
          <Link href="/about" className="text-slate-400 hover:text-slate-200">
            About
          </Link>
          <Link href="/faq" className="text-slate-400 hover:text-slate-200">
            FAQ
          </Link>
          <Link href="/kickoff" className="text-slate-400 hover:text-slate-200">
            Kickoff
          </Link>
          <Link href="/onchain" className="text-slate-400 hover:text-slate-200">
            Onchain
          </Link>
          <Link href="/support" className="text-slate-400 hover:text-slate-200">
            Support
          </Link>
          <a
            href="/agent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200"
          >
            Agent
          </a>
        </nav>
      </div>
    </footer>
  );
}
