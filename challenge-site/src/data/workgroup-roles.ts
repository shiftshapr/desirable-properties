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

export const CO_EDITOR_ROLE: WorkgroupRole = {
  key: 'co_editor',
  label: 'Co-editor',
  description:
    'One of two co-editors per DP. Both co-editors must approve a proposal before it is incorporated into the next revision. Claim an open seat on the workgroup page.',
  glyph: '◫',
  duties: [
    'approve or decline each proposal with a review note',
    'agree with the other co-editor before anything is incorporated',
    'keep no proposal waiting more than 7 days',
    'publish integrated changes as a numbered revision',
    'check the chapter against the V1 readiness checklist',
  ],
};

/** Retired role (October 2026); label kept for existing records. */
export const CO_LEAD_ROLE: WorkgroupRole = {
  key: 'co_lead',
  label: 'Co-lead',
  description: 'Retired role. Workgroups now have members, two co-editors, and a coordinator.',
  glyph: '◫',
  duties: [],
};
