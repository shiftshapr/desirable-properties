import { OPTION_PROVENANCE } from '@/data/sessions/option-provenance';
import { provenanceId, type OptionProvenance } from '@/lib/sessions/option-provenance-core';

const BY_ID = new Map(OPTION_PROVENANCE.map((r) => [r.id, r]));

/** The record for one ballot option, or null when there is none. */
export function provenanceFor(session: string, question: string, option: string): OptionProvenance | null {
  return BY_ID.get(provenanceId(session, question, option)) ?? null;
}

/** Every record, in the order of the data file (session, then question, then option). */
export function allProvenance(): readonly OptionProvenance[] {
  return OPTION_PROVENANCE;
}
