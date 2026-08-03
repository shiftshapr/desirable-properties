'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import SiteModalsBanner from '@/components/SiteModalsBanner';
import { AuthProvider } from '@/lib/auth-context';

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAgentPage = pathname === '/agent' || pathname.startsWith('/agent/');

  return (
    <AuthProvider>
      <div className="flex min-h-dvh flex-col">
        {isAgentPage ? null : <SiteHeader />}
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        {isAgentPage ? null : <SiteFooter />}
        {isAgentPage ? null : <SiteModalsBanner />}
      </div>
    </AuthProvider>
  );
}
