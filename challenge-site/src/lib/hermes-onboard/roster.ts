import rosterJson from '@/data/alliance-roster.json';
import {
  findRosterByDomain as findByDomain,
  getRosterOrg as getOrg,
  slugFromHostname,
} from '@/lib/hermes-onboard/pad-lookup.mjs';
import type { AllianceRoster, RosterOrg } from '@/lib/hermes-onboard/types';

const roster = rosterJson as AllianceRoster;

export function getAllianceRoster(): AllianceRoster {
  return roster;
}

export function listRosterOrgs(): RosterOrg[] {
  return roster.orgs;
}

export function getRosterOrg(slug: string): RosterOrg | null {
  return getOrg(roster.orgs, slug);
}

export function findRosterByDomain(domain: string): RosterOrg | null {
  return findByDomain(roster.orgs, domain);
}

export { slugFromHostname };
