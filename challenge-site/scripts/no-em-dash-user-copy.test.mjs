import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const EM = '\u2014';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');

/** User-visible invite/workgroup/modal copy (not code comments). */
const USER_FACING_FILES = [
  'src/components/workgroup/WorkgroupInviteWelcomeModal.tsx',
  'src/components/workgroup/WorkgroupInviteAiPanel.tsx',
  'src/lib/ai-prompt-info.ts',
  'src/lib/workgroup-ai-prompts.ts',
  'src/components/workgroup/HermesExperimentalInstructionsModal.tsx',
  'src/components/workgroup/WorkgroupHermesPanel.tsx',
  'src/components/workgroup/WorkgroupActivityFeed.tsx',
  'src/components/HermesContributionPanel.tsx',
  'src/components/workgroup/HermesExperimentalBadge.tsx',
  'src/components/HermesComposerAiAssist.tsx',
  'src/app/events/page.tsx',
  'src/components/pathways/FeaturedPathwayPanel.tsx',
  'src/app/support/SupportPageClient.tsx',
  'src/lib/dp-registry.ts',
];

test('invite and workgroup user-facing copy uses en dashes, not em dashes', async () => {
  const offenders = [];
  for (const rel of USER_FACING_FILES) {
    const text = await readFile(resolve(root, rel), 'utf8');
    if (text.includes(EM)) offenders.push(rel);
  }
  assert.equal(
    offenders.length,
    0,
    `Em dash (U+2014) in user-facing copy: ${offenders.join(', ')}`,
  );
});
