'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SiteModalsBanner from '@/components/SiteModalsBanner';
import type { AuthUser } from '@/lib/auth-types';
import { AuthProvider } from '@/lib/auth-context';
import type { SiteNavLink } from '@/lib/siteNav';
import { SITE_NAV_LINKS } from '@/lib/siteNav';

type SiteShellProps = {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialChecked?: boolean;
  navLinks?: SiteNavLink[];
  /** Server-side phoneOptinEnabled(): adds Account (/account) to the signed-in menu. */
  accountSettings?: boolean;
};

export default function SiteShell({
  children,
  initialUser = null,
  initialChecked = false,
  navLinks = SITE_NAV_LINKS,
  accountSettings = false,
}: SiteShellProps) {
  const pathname = usePathname();
  const isAgentPage = pathname === '/agent' || pathname.startsWith('/agent/');

  return (
    <AuthProvider initialUser={initialUser} initialChecked={initialChecked}>
      <div className={`flex flex-col ${isAgentPage ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
        {isAgentPage ? null : <SiteHeader navLinks={navLinks} accountSettings={accountSettings} />}
        <main className={`flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-clip ${isAgentPage ? 'overflow-hidden' : ''}`}>
          {children}
        </main>
        {isAgentPage ? null : <SiteFooter />}
        {isAgentPage ? null : <SiteModalsBanner />}
      </div>
    </AuthProvider>
  );
}
