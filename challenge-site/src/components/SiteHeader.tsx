import Image from 'next/image';
import Link from 'next/link';
import SiteAuthNav from '@/components/SiteAuthNav';
import SiteHeaderNav from '@/components/SiteHeaderNav';

export default function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="site-header-inner relative mx-auto max-w-6xl min-w-0 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
          <Link
            href="/"
            className="site-header-brand flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold tracking-wide text-cyan-300"
          >
            <Image
              src="/images/dp-challenge-logo.webp"
              alt="Desirable Properties Challenge"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0"
              priority
            />
            <span className="sr-only sm:not-sr-only">DP Challenge</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="order-2 min-w-0 lg:order-1">
              <SiteHeaderNav />
            </div>
            <div className="order-1 flex shrink-0 items-center border-r border-slate-800 pr-3 sm:pr-4 lg:order-2 lg:border-r-0 lg:border-l lg:pl-5 lg:pr-0">
              <SiteAuthNav />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
