import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Row written by scripts/canopi_patch_file_to_govhub.py (data/loop/canopi-filing-<env>.json). */
export type CanopiFilingRow = {
  id: string;
  status: 'filed' | 'already_filed' | 'would_file' | 'blocked' | 'error' | string;
  page_dp?: string;
  home_dp?: string;
  draft_ref?: string;
  reason?: string;
};

/**
 * Filing outcome per Canopi message id, so Review can say where a book patch went
 * (e.g. posted on the DP1 page but anchored and filed in DP22) or why it was not filed.
 */
export async function loadCanopiFilingReport(): Promise<Map<string, CanopiFilingRow>> {
  const env = process.env.DP_ENV === 'staging' ? 'staging' : 'prod';
  const dir = process.env.DP_LOOP_DATA_DIR || '/home/ubuntu/desirable-properties/data/loop';
  try {
    const raw = await readFile(path.join(dir, `canopi-filing-${env}.json`), 'utf8');
    const rows = (JSON.parse(raw)?.posts ?? []) as CanopiFilingRow[];
    return new Map(rows.map((r) => [r.id, r]));
  } catch {
    return new Map();
  }
}
