export type WorkgroupRole = {
  key: string;
  label: string;
  description: string;
  glyph?: string;
  duties: readonly string[];
};

export const MEMBER_ROLE: WorkgroupRole = {
  key: 'member',
  label: 'Member',
  description:
    'Joining is low-commitment and reversible. Members read drafts, discuss on the book, patch on Gov Hub, and contribute wherever time and interest align.',
  duties: [
    'reviewing community submissions',
    'discussing proposals',
    'suggesting improvements',
    'identifying missing ideas',
    'proposing examples',
    'helping resolve ambiguities',
    'reviewing AI-generated synthesis',
    'contributing patches',
    'participating in consensus discussions',
  ],
};

export const COORDINATOR_ROLE: WorkgroupRole = {
  key: 'coordinator',
  label: 'Coordinator',
  description: 'Coordinates the workgroup, sets agenda, and supports contributors.',
  glyph: '★',
  duties: [
    'organize meetings',
    'facilitate productive discussions',
    'maintain the shared working document',
    'encourage broad participation',
    'ensure every proposal receives consideration',
    'coordinate with the DP Community AI',
    'identify areas of rough consensus',
    'document unresolved questions',
    'prepare recommended revisions for the editorial team',
  ],
};

export const CO_LEAD_ROLE: WorkgroupRole = {
  key: 'co_lead',
  label: 'Co-lead',
  description:
    'Shares recruitment, member approvals, and contributor coordination with the coordinator.',
  glyph: '◫',
  duties: COORDINATOR_ROLE.duties,
};
