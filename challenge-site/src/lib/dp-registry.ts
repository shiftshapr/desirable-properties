import desirableProperties from '@/data/desirable-properties.json';
import dpInscriptions from '@/data/dp-inscriptions.json';
import dpMlDraftMap from '@/data/dp-ml-draft-map.json';
import { getCivicChallenge } from '@/lib/civic-challenges';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';

export type DpRegistryEntry = {
  id: string;
  name: string;
  category: string;
  description: string;
  mlNumber: string | null;
  mlLabel: string | null;
  status: 'inscribed' | 'draft';
  govhubUrl: string | null;
  siteUrl: string;
};

const dpById = new Map(
  desirableProperties.desirable_properties.map((dp) => [dp.id.toUpperCase(), dp]),
);

const mlByDp = dpMlDraftMap.map as Record<
  string,
  { mlNumber: string; label: string; status: string }
>;

function govhubDraftUrl(mlNumber: string): string {
  return `${GOVHUB_PUBLIC_BASE_URL}/doc/draft/${mlNumber}/`;
}

export function getDpRegistryEntry(dpId: string | null | undefined): DpRegistryEntry | null {
  if (!dpId) return null;
  const normalized = dpId.toUpperCase().startsWith('DP') ? dpId.toUpperCase() : `DP${dpId}`;
  const dp = dpById.get(normalized);
  if (!dp) return null;

  const ml = mlByDp[normalized];
  const draftOnly = dpInscriptions.draft_only?.[normalized as keyof typeof dpInscriptions.draft_only];
  const inscribed = Boolean(dpInscriptions.by_dp_id[normalized as keyof typeof dpInscriptions.by_dp_id]);
  const mlNumber = ml?.mlNumber ?? draftOnly?.ml_number ?? null;

  return {
    id: normalized,
    name: dp.name,
    category: dp.category,
    description: dp.description,
    mlNumber,
    mlLabel: ml?.label ?? null,
    status: inscribed ? 'inscribed' : 'draft',
    govhubUrl: draftOnly?.govhub_url ?? (mlNumber ? govhubDraftUrl(mlNumber) : null),
    siteUrl: `/dp/${normalized.toLowerCase()}`,
  };
}

export function listDpRegistryEntries(): DpRegistryEntry[] {
  return desirableProperties.desirable_properties.map((dp) => getDpRegistryEntry(dp.id)!);
}

export function dpContextBlurb(dpId: string | null | undefined): string | null {
  const entry = getDpRegistryEntry(dpId);
  if (!entry) return null;
  const statusNote =
    entry.status === 'draft'
      ? ' (draft – not yet inscribed on Bitcoin)'
      : ' (inscribed on Bitcoin)';
  const mlNote = entry.mlNumber ? ` Gov Hub: ${entry.mlNumber}.` : '';
  const challenge = getCivicChallenge(entry.id);
  if (challenge) {
    return `${entry.id} – ${entry.name}${statusNote}.${mlNote} Guiding question: ${challenge.guidingQuestion} Human issue: ${challenge.humanIssue}. ${challenge.summary}`;
  }
  return `${entry.id} – ${entry.name}${statusNote}.${mlNote} ${entry.description}`;
}
