import { ESTATE_SOCIAL_FOLLOW_LINKS } from '@/lib/estate-social';

export default function EstateSocialStrip() {
  return (
    <div
      className="border-b border-slate-800/80 bg-slate-950/40"
      aria-label="Follow the Meta-Layer estate"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Follow</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {ESTATE_SOCIAL_FOLLOW_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-300 hover:text-cyan-100"
              aria-label={link.label}
            >
              {link.shortLabel}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
