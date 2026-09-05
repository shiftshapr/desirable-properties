export const ASTRA_APPLAUSE_MAX_PER_USER = 10;

/** Canonical workgroup key – Astra applause is global per change, not per workgroup. */
export const ASTRA_APPLAUSE_GLOBAL_WORKGROUP_ID = 'astra-global';

export type AstraApplauseSnapshot = {
  totals: Record<string, number>;
  mine: Record<string, number>;
};
