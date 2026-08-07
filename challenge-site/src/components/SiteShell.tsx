'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SiteModalsBanner from '@/components/SiteModalsBanner';
import type { AuthUser } from '@/lib/auth-types';
import { AuthProvider } from '@/lib/auth-context';

type SiteShellProps = {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialChecked?: boolean;
};

export default function SiteShell({
  children,
  initialUser = null,
  initialChecked = false,
}: SiteShellProps) {
  const pathname = usePathname();
  const isAgentPage = pathname === '/agent' || pathname.startsWith('/agent/');

  return (
    <AuthProvider initialUser={initialUser} initialChecked={initialChecked}>
      <div className="flex min-h-dvh flex-col">
        {isAgentPage ? null : <SiteHeader />}
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        {isAgentPage ? null : <SiteFooter />}
        {isAgentPage ? null : <SiteModalsBanner />}
      </div>
    </AuthProvider>
  );
}
