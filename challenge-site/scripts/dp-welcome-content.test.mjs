import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseWelcomeContent, renderWelcomeContent } from './generate-dp-welcome-content.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const challengeRoot = resolve(scriptDir, '..');
const repositoryRoot = resolve(challengeRoot, '..');

test('generated welcome content exactly matches the canonical documentation', async () => {
  const markdown = await readFile(resolve(repositoryRoot, 'docs/dp-welcome-messages.md'), 'utf8');
  const generated = await readFile(
    resolve(challengeRoot, 'src/lib/dp-welcome-content.generated.ts'),
    'utf8',
  );

  assert.equal(generated, renderWelcomeContent(parseWelcomeContent(markdown)));
});

test('lead welcome renders complete Message A before Message B', async () => {
  const view = await readFile(resolve(challengeRoot, 'src/components/DpWelcomeView.tsx'), 'utf8');
  const messageAEnd = view.indexOf('{a.closing}');
  const leadBlock = view.indexOf("{variant === 'lead'");

  assert.ok(messageAEnd >= 0, 'Message A closing is rendered');
  assert.ok(leadBlock > messageAEnd, 'lead-only Message B block follows all of Message A');
});

test('workgroup cards retain their direct-join continuation parameter', async () => {
  const joinPage = await readFile(
    resolve(challengeRoot, 'src/app/workgroups/join/page.tsx'),
    'utf8',
  );

  assert.match(joinPage, /const joinHref = `\$\{wgHref\}\?action=join`;/);
});
