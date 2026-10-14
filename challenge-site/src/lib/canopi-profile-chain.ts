/**
 * Order of lookups that finds a Canopi profile for a Gov Hub user.
 * Pure (lookups are injected, no `@/` imports) so
 * `scripts/workgroup-relay-message.test.mjs` can run it with `node --experimental-strip-types`.
 */

export type CanopiProfileLookups<P> = {
  byHandle: (handle: string) => Promise<P | null>;
  byEmail: (email: string) => Promise<P | null>;
  byDisplayName: (displayName: string) => Promise<P | null>;
};

/**
 * 1. Gov Hub handle as a Canopi handle, 2. Gov Hub account email, 3. exact display name.
 * Step 3 runs only when `allowNameMatch` is true (the roster). Relayed email authors pass
 * false: identity by email only, never by name, since a wrong person's link is worse than none.
 */
export async function resolveCanopiProfileChain<P>(
  person: { handle?: string | null; email?: string | null; displayName?: string | null },
  lookups: CanopiProfileLookups<P>,
  opts: { allowNameMatch: boolean },
): Promise<P | null> {
  const handle = String(person.handle || '').trim().replace(/^@/, '');
  if (handle) {
    const profile = await lookups.byHandle(handle);
    if (profile) return profile;
  }

  const email = String(person.email || '').trim();
  if (email) {
    const profile = await lookups.byEmail(email);
    if (profile) return profile;
  }

  if (!opts.allowNameMatch) return null;
  const name = String(person.displayName || '').trim();
  return name ? lookups.byDisplayName(name) : null;
}
