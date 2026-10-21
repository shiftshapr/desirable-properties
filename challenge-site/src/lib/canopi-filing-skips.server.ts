import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Canopi book posts the filer deliberately does not file (duplicates of another post), from
 * scripts/canopi_filing_overrides.json entries with a "skip" reason. They are not open
 * proposals, so Review and the open-proposal counts leave them out.
 */
const OVERRIDES = path.resolve(process.cwd(), '..', 'scripts/canopi_filing_overrides.json');
let cached: Set<string> | null = null;

export async function skippedCanopiPostIds(): Promise<Set<string>> {
  if (cached) return cached;
  try {
    const raw = JSON.parse(await readFile(OVERRIDES, 'utf8')) as Record<string, { skip?: string } | string>;
    cached = new Set(
      Object.entries(raw)
        .filter(([key, value]) => !key.startsWith('_') && typeof value === 'object' && value && value.skip)
        .map(([key]) => key),
    );
  } catch {
    cached = new Set();
  }
  return cached;
}
