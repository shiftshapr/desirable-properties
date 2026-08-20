import directoryJson from '@/data/alliance-directory.json';
import type { AllianceDirectory, AllianceOrg } from '@/lib/hermes-onboard/types';

const directory = directoryJson as AllianceDirectory;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Hyphen-insensitive lookup key (project-liberty and projectliberty both map here). */
export function allianceSlugKey(slug: string): string {
  return slug.replace(/-/g, '');
}

/** Cohort slug is not an org pad; `/pad/{cohort}` shows the generic pad index. */
export const PAD_INDEX_ALIAS_SLUG = directory.cohort;

export function isPadIndexAliasSlug(slug: string): boolean {
  return allianceSlugKey(slug) === allianceSlugKey(PAD_INDEX_ALIAS_SLUG);
}

export function isAllianceSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length <= 80;
}

export function getAllianceDirectory(): AllianceDirectory {
  return directory;
}

export function listAllianceOrgs(): AllianceOrg[] {
  return directory.orgs;
}

export function getAllianceOrg(slug: string): AllianceOrg | null {
  if (!isAllianceSlug(slug)) return null;
  const exact = directory.orgs.find((org) => org.slug === slug);
  if (exact) return exact;
  const key = allianceSlugKey(slug);
  return directory.orgs.find((org) => allianceSlugKey(org.slug) === key) || null;
}

/** Canonical directory slug for URL variants (e.g. projectliberty -> project-liberty). */
export function resolveAllianceSlug(slug: string): string | null {
  return getAllianceOrg(slug)?.slug ?? null;
}

export function resolvePartnerOrgs(org: AllianceOrg): AllianceOrg[] {
  return org.partners
    .map((slug) => getAllianceOrg(slug))
    .filter((partner): partner is AllianceOrg => Boolean(partner));
}
