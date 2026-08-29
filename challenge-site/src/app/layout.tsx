import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import SiteShell from '@/components/SiteShell';
import CanonicalHostScript from '@/components/CanonicalHostScript';
import Web3AuthConfigScript from '@/components/Web3AuthConfigScript';
import { refreshSessionFromCanopi } from '@/lib/auth-profile';
import { createSessionCookie, readSession, sessionToAuthUser } from '@/lib/auth-session';
import { cookies } from 'next/headers';
import { listUpcomingEventEntries } from '@/lib/dp-event-series-store';
import { buildSiteNavLinks, upcomingEventNavLabel } from '@/lib/siteNav';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Desirable Properties Challenge',
  description:
    'A living governance challenge to define, refine, and operationalize the Desirable Properties of a trustworthy Meta-Layer.',
  // icons resolved automatically from src/app/icon.svg (Desirable Properties book cover)
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readSession();
  let initialUser = sessionToAuthUser(session);
  if (session) {
    const refreshed = await refreshSessionFromCanopi(session);
    if (refreshed) {
      initialUser = {
        ...sessionToAuthUser(session)!,
        profileImage: refreshed.profileImage,
      };
      if (refreshed.changed) {
        const store = await cookies();
        store.set(
          await createSessionCookie({
            ...session,
            profileImage: refreshed.profileImage,
            canopiUserId: refreshed.canopiUserId,
          }),
        );
      }
    }
  }
  const upcoming = await listUpcomingEventEntries();
  const navLinks = buildSiteNavLinks(
    upcoming.map((event) => ({
      href: event.href,
      label: upcomingEventNavLabel(event.dateLabel, event.title),
      external: event.external,
    })),
  );

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <CanonicalHostScript />
        <Web3AuthConfigScript />
      </head>
      <body className="flex min-h-dvh flex-col bg-slate-950 text-slate-100 antialiased">
        <SiteShell initialUser={initialUser} initialChecked navLinks={navLinks}>
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
