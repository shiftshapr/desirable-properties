import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const generatedPath = resolve(scriptDir, '../src/lib/dp-welcome-content.generated.ts');

function welcomePath(variant) {
  return variant === 'member' ? '/welcome/member' : '/welcome/coordinator';
}

function buildDefaultProfileWelcome(variant = 'member', copy) {
  const selected = variant === 'member' ? copy.member : copy.coordinator;
  return {
    id: `default-${variant}-welcome`,
    title: selected.linkLabel,
    link_url: welcomePath(variant),
    variant,
    is_default: true,
  };
}

function resolveDefaultWelcomeVariant(welcomes) {
  return welcomes.some((welcome) => welcome.variant === 'coordinator') ? 'coordinator' : 'member';
}

test('generated profile welcome copy matches join email onboarding blurb', async () => {
  const generated = await readFile(generatedPath, 'utf8');
  assert.match(generated, /PROFILE_WELCOME_MEMBER/);
  assert.match(generated, /Help refine Desirable Properties v0\.77 into v1\.0/);
  assert.match(generated, /Open your welcome guide/);
  assert.match(generated, /PROFILE_WELCOME_COORDINATOR/);
  assert.match(generated, /Open your combined welcome guide/);
});

test('default profile welcome uses contributor path unless coordinator', async () => {
  const generated = await readFile(generatedPath, 'utf8');
  const memberBodyMatch = generated.match(/"body": "(Help refine[^"]+)"/);
  assert.ok(memberBodyMatch, 'member profile welcome body is exported');

  const copy = {
    member: {
      linkLabel: 'Open your welcome guide',
      body: memberBodyMatch[1],
    },
    coordinator: {
      linkLabel: 'Open your combined welcome guide',
      body: "You're approved as workgroup coordinator.",
    },
  };

  const member = buildDefaultProfileWelcome('member', copy);
  assert.equal(member.variant, 'member');
  assert.equal(member.link_url, '/welcome/member');
  assert.equal(member.is_default, true);

  const coordinator = buildDefaultProfileWelcome('coordinator', copy);
  assert.equal(coordinator.variant, 'coordinator');
  assert.equal(coordinator.link_url, '/welcome/coordinator');

  assert.equal(resolveDefaultWelcomeVariant([]), 'member');
  assert.equal(resolveDefaultWelcomeVariant([{ variant: 'coordinator' }]), 'coordinator');
});
