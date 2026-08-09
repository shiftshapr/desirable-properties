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
};

export default function SiteShell({
  children,
  initialUser = null,
  initialChecked = false,
  navLinks = SITE_NAV_LINKS,
}: SiteShellProps) {
  const pathname = usePathname();
  const isAgentPage = pathname === '/agent' || pathname.startsWith('/agent/');

  return (
    <AuthProvider initialUser={initialUser} initialChecked={initialChecked}>
      <div className="flex min-h-dvh flex-col">
        {isAgentPage ? null : <SiteHeader navLinks={navLinks} />}
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        {isAgentPage ? null : <SiteFooter />}
        {isAgentPage ? null : <SiteModalsBanner />}
      </div>
    </AuthProvider>
  );
}
