import 'server-only';
import type { CouncilMember } from '@/lib/screening/screening-core';

/**
 * Interim DP council (voted in the 16 Nov 2026 ballot): the only accounts that may object to a draft ballot question.
 * Server-only. Mapped by Gov Hub account id (the site session's userId, set at sign-in from Gov Hub's verified login),
 * looked up read-only on 24 Nov 2026 and matched on name and username. `name` is what the page shows.
 *
 * Production and staging sign in against different Gov Hubs (interfacehub.net and dev.interfacehub.net), whose ids
 * differ for some accounts, so each environment has its own list (DP_ENV). A member missing from a list cannot object
 * there. Phahsa holds two Gov Hub accounts; only the one he signs in with (bitracer1) is mapped, so one person has
 * one seat. Renad Baomar has no account on the staging Gov Hub.
 */
const PRODUCTION: readonly CouncilMember[] = [
  { userId: '57e7c23e-29ec-423a-baee-51ddf34a8174', name: 'Daveed Benjamin' },
  { userId: '372e5bbb-794d-4612-bed6-d6cf8bb75535', name: 'Leandra Preston' },
  { userId: 'a85df179-ad87-4aa7-af83-34e336e2e045', name: 'Michelle Thuo' },
  { userId: 'b83c86b5-8a10-490e-92cf-d3f0a19af5e3', name: 'Phahsa' },
  { userId: 'a7403d8a-cde3-424d-953e-e11f7aa4cb56', name: 'Renad Baomar' },
];

const STAGING: readonly CouncilMember[] = [
  { userId: '1920eb85-4e36-4d61-af5a-b42e83183ec8', name: 'Daveed Benjamin' },
  { userId: '372e5bbb-794d-4612-bed6-d6cf8bb75535', name: 'Leandra Preston' },
  { userId: 'a85df179-ad87-4aa7-af83-34e336e2e045', name: 'Michelle Thuo' },
  { userId: 'b83c86b5-8a10-490e-92cf-d3f0a19af5e3', name: 'Phahsa' },
];

export function interimCouncil(): readonly CouncilMember[] {
  const env = (process.env.DP_ENV || '').toLowerCase();
  return env === 'prod' || env === 'production' ? PRODUCTION : STAGING;
}
