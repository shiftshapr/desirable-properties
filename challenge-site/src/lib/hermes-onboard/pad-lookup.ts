import directoryJson from '@/data/alliance-directory.json';
import rosterJson from '@/data/alliance-roster.json';
import {
  resolvePadLookup as resolveLookup,
  resolvePadSlugFromInput as resolveFromOrgs,
} from '@/lib/hermes-onboard/pad-lookup.mjs';
import type {
  AllianceDirectory,
  AllianceOrg,
  AllianceRoster,
  PadLookupResult,
} from '@/lib/hermes-onboard/types';

const directory = directoryJson as AllianceDirectory;
const roster = rosterJson as AllianceRoster;

export type PadLookupOrgRef = Pick<
  AllianceOrg,
  'slug' | 'name' | 'shortName' | 'claimDomains' | 'tags'
>;

export function padLookupOrgRefs(orgs: AllianceOrg[] = directory.orgs): PadLookupOrgRef[] {
  return orgs.map(({ slug, name, shortName, claimDomains, tags }) => ({
    slug,
    name,
    shortName,
    claimDomains,
    tags,
  }));
}

/** Resolve visitor input (org name, slug, or website URL) to a canonical pad slug. */
export function resolvePadSlugFromInput(input: string): string | null {
  return resolveFromOrgs(directory.orgs, input);
}

/** Resolve visitor input against directory pads and the prework roster. */
export function resolvePadLookup(input: string): PadLookupResult {
  return resolveLookup(directory.orgs, roster.orgs, input);
}
