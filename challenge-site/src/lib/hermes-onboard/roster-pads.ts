import padsJson from '@/data/alliance-roster-pads.json';
import { allianceSlugKey } from '@/lib/hermes-onboard/directory';
import type { AllianceRosterPads, RosterPadEntry } from '@/lib/hermes-onboard/types';

const pads = padsJson as AllianceRosterPads;

export function getRosterPadsPacket(): AllianceRosterPads {
  return pads;
}

export function listRosterPadEntries(): RosterPadEntry[] {
  return pads.orgs;
}

export function getRosterPadEntry(slug: string): RosterPadEntry | null {
  const exact = pads.orgs.find((org) => org.slug === slug);
  if (exact) return exact;
  const key = allianceSlugKey(slug);
  return pads.orgs.find((org) => allianceSlugKey(org.slug) === key) || null;
}
