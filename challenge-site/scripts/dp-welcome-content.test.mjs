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

test('coordinator welcome renders complete Message A before Message B', async () => {
  const view = await readFile(resolve(challengeRoot, 'src/components/DpWelcomeView.tsx'), 'utf8');
  const messageAEnd = view.indexOf('{a.closing}');
  const coordinatorBlock = view.indexOf("{variant === 'coordinator'");

  assert.ok(messageAEnd >= 0, 'Message A closing is rendered');
  assert.ok(
    coordinatorBlock > messageAEnd,
    'coordinator-only Message B block follows all of Message A',
  );
});

test('the challenge arc leads Message A and its image exists', async () => {
  const view = await readFile(resolve(challengeRoot, 'src/components/DpWelcomeView.tsx'), 'utf8');
  const arc = view.indexOf('{a.arcIntro}');
  const mission = view.indexOf('{a.missionTitle}');

  assert.ok(arc >= 0, 'arc introduction is rendered');
  assert.ok(arc < mission, 'arc introduction precedes the mission section');

  const markdown = await readFile(resolve(repositoryRoot, 'docs/dp-welcome-messages.md'), 'utf8');
  const src = parseWelcomeContent(markdown).messageA.arcImage.src;
  await readFile(resolve(challengeRoot, 'public', src.replace(/^\//, '')));
});

test('welcome copy uses coordinator rather than lead or chair', async () => {
  const markdown = await readFile(resolve(repositoryRoot, 'docs/dp-welcome-messages.md'), 'utf8');
  const messageBody = markdown.slice(markdown.indexOf('## Message A'), markdown.indexOf('## Review standard'));

  assert.doesNotMatch(messageBody, /\bchairs?\b/i);
  assert.doesNotMatch(messageBody, /(?<!co-)\bleads?\b/i);
});

test('workgroup cards retain their direct-join continuation parameter', async () => {
  const joinPage = await readFile(
    resolve(challengeRoot, 'src/app/workgroups/join/page.tsx'),
    'utf8',
  );

  assert.match(joinPage, /const joinHref = `\$\{wgHref\}\?action=join`;/);
});
