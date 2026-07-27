import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Desirable Properties Challenge · Meta-Layer Initiative</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/about" className="text-cyan-300 hover:text-cyan-200">
            About
          </Link>
          <Link href="/participate" className="text-slate-400 hover:text-slate-200">
            Participate
          </Link>
          <Link href="/challenge" className="text-slate-400 hover:text-slate-200">
            Challenge
          </Link>
          <Link href="/#dps" className="text-slate-400 hover:text-slate-200">
            Browse DPs
          </Link>
          <Link href="/support" className="text-slate-400 hover:text-slate-200">
            Support
          </Link>
          <Link href="/onchain" className="text-slate-400 hover:text-slate-200">
            Onchain
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
