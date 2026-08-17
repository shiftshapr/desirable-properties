import type { CivicChallenge, CivicChallengeIndex } from '@/data/civic-challenges/schema';
import { parseCivicChallenge } from '@/data/civic-challenges/schema';
import civicIndex from '@/data/civic-challenges/index.json';

import dp1 from '@/data/civic-challenges/dp1.json';
import dp2 from '@/data/civic-challenges/dp2.json';
import dp3 from '@/data/civic-challenges/dp3.json';
import dp4 from '@/data/civic-challenges/dp4.json';
import dp5 from '@/data/civic-challenges/dp5.json';
import dp6 from '@/data/civic-challenges/dp6.json';
import dp7 from '@/data/civic-challenges/dp7.json';
import dp8 from '@/data/civic-challenges/dp8.json';
import dp9 from '@/data/civic-challenges/dp9.json';
import dp10 from '@/data/civic-challenges/dp10.json';
import dp11 from '@/data/civic-challenges/dp11.json';
import dp12 from '@/data/civic-challenges/dp12.json';
import dp13 from '@/data/civic-challenges/dp13.json';
import dp14 from '@/data/civic-challenges/dp14.json';
import dp15 from '@/data/civic-challenges/dp15.json';
import dp16 from '@/data/civic-challenges/dp16.json';
import dp17 from '@/data/civic-challenges/dp17.json';
import dp18 from '@/data/civic-challenges/dp18.json';
import dp19 from '@/data/civic-challenges/dp19.json';
import dp20 from '@/data/civic-challenges/dp20.json';
import dp21 from '@/data/civic-challenges/dp21.json';
import dp22 from '@/data/civic-challenges/dp22.json';

const BY_FILE: Record<string, unknown> = {
  'dp1.json': dp1,
  'dp2.json': dp2,
  'dp3.json': dp3,
  'dp4.json': dp4,
  'dp5.json': dp5,
  'dp6.json': dp6,
  'dp7.json': dp7,
  'dp8.json': dp8,
  'dp9.json': dp9,
  'dp10.json': dp10,
  'dp11.json': dp11,
  'dp12.json': dp12,
  'dp13.json': dp13,
  'dp14.json': dp14,
  'dp15.json': dp15,
  'dp16.json': dp16,
  'dp17.json': dp17,
  'dp18.json': dp18,
  'dp19.json': dp19,
  'dp20.json': dp20,
  'dp21.json': dp21,
  'dp22.json': dp22,
};

const index = civicIndex as CivicChallengeIndex;

function normalizeChallengeId(raw: string): string {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (s.startsWith('dp')) return s.replace(/^dp0*/, 'dp');
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return `dp${n}`;
  return s;
}

/** Catalog DP id like "DP1" → civic id "dp1". */
export function catalogIdToCivicId(catalogId: string): string {
  return normalizeChallengeId(catalogId);
}

export function listCivicChallenges(): CivicChallenge[] {
  const out: CivicChallenge[] = [];
  for (const entry of index.challenges) {
    const parsed = parseCivicChallenge(BY_FILE[entry.file]);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function getCivicChallenge(idOrCatalogId: string | null | undefined): CivicChallenge | null {
  if (!idOrCatalogId) return null;
  const id = normalizeChallengeId(idOrCatalogId);
  if (!id) return null;
  const entry = index.challenges.find((c) => c.id === id || `dp${c.number}` === id);
  if (!entry) return null;
  return parseCivicChallenge(BY_FILE[entry.file]);
}

export function getCivicChallengeIndex(): CivicChallengeIndex {
  return index;
}
