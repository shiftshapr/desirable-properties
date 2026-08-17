/** Canonical Gov Hub workgroup slugs for numbered Desirable Properties. */
export const DP_WORKGROUP_SLUGS: Record<string, string> = {
  DP1: 'dp1-federated-auth',
  DP2: 'dp2-participant-agency',
  DP3: 'dp3-adaptive-governance',
  DP4: 'dp4-data-sovereignty',
  DP5: 'dp5-decentralized-namespace',
  DP6: 'dp6-commerce',
  DP7: 'dp7-simplicity-interoperability',
  DP8: 'dp8-collaborative-environment',
  DP9: 'dp9-developer-incentives',
  DP10: 'dp10-education',
  DP11: 'dp11-safe-ethical-ai',
  DP12: 'dp12-community-ai-governance',
  DP13: 'dp13-ai-containment',
  DP14: 'dp14-trust-transparency',
  DP15: 'dp15-security-provenance',
  DP16: 'dp16-roadmap-milestones',
  DP17: 'dp17-financial-sustainability',
  DP18: 'dp18-feedback-reputation',
  DP19: 'dp19-community-engagement',
  DP20: 'dp20-community-ownership',
  DP21: 'dp21-multi-modal',
  DP22: 'dp22-civic-memory-epistemic-continuity',
  DP23: 'dp23-universal-participation-linguistic-interoperability',
};

export function dpWorkgroupSlug(dpId: string | null | undefined): string | null {
  if (!dpId) return null;
  const key = dpId.toUpperCase().startsWith('DP') ? dpId.toUpperCase() : `DP${dpId}`;
  return DP_WORKGROUP_SLUGS[key] ?? null;
}
