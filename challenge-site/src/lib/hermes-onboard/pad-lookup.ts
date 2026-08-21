import directoryJson from '@/data/alliance-directory.json';
import corpusJson from '@/data/alliance-roster-corpus.json';
import rosterJson from '@/data/alliance-roster.json';
import {
  resolvePadLookup as resolveLookup,
  resolvePadSlugFromInput as resolveFromOrgs,
} from '@/lib/hermes-onboard/pad-lookup.mjs';
import type {
  AllianceDirectory,
  AllianceOrg,
  AllianceRoster,
  AllianceRosterCorpus,
  PadLookupResult,
} from '@/lib/hermes-onboard/types';

const stewards = directoryJson as AllianceDirectory;
const corpus = corpusJson as AllianceRosterCorpus;
const roster = rosterJson as AllianceRoster;

const mergedOrgs: AllianceOrg[] = [
  ...stewards.orgs,
  ...corpus.orgs.filter((org) => !stewards.orgs.some((s) => s.slug === org.slug)),
];

const directory: AllianceDirectory = { ...stewards, orgs: mergedOrgs };

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
