import directoryJson from '@/data/alliance-directory.json';
import type { AllianceDirectory, AllianceOrg } from '@/lib/hermes-onboard/types';

const directory = directoryJson as AllianceDirectory;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  return directory.orgs.find((org) => org.slug === slug) || null;
}

export function resolvePartnerOrgs(org: AllianceOrg): AllianceOrg[] {
  return org.partners
    .map((slug) => getAllianceOrg(slug))
    .filter((partner): partner is AllianceOrg => Boolean(partner));
}
