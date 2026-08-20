import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const dirPath = path.join(
  process.cwd(),
  'src/data/alliance-directory.json',
);

test('Alliance directory is a valid public packet', () => {
  const directory = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  assert.equal(directory.cohort, 'project-liberty-alliance');
  assert.ok(Array.isArray(directory.orgs) && directory.orgs.length >= 1);

  const slugs = new Set();
  for (const org of directory.orgs) {
    assert.match(org.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(slugs.has(org.slug), false);
    slugs.add(org.slug);
    assert.ok(org.name);
    assert.ok(org.mission);
    assert.ok(Array.isArray(org.values) && org.values.length > 0);
    assert.ok(Array.isArray(org.sources) && org.sources.length > 0);
    for (const source of org.sources) {
      assert.ok(source.url.startsWith('https://'));
      assert.ok(source.label);
    }
    for (const partner of org.partners) {
      assert.ok(directory.orgs.some((row) => row.slug === partner), `missing partner ${partner}`);
    }
    assert.ok(org.pitch?.headline);
    assert.ok(org.pitch?.lead);
    assert.ok(org.pitch?.ask);
    assert.ok(org.pitch?.captureLine);
    assert.ok(Array.isArray(org.relatedDps) && org.relatedDps.length > 0);
    for (const dpId of org.relatedDps) {
      assert.match(dpId, /^DP\d+$/);
    }
  }

  assert.ok(slugs.has('project-liberty'));
});

test('onboard tab ids are linkable query values', () => {
  const tabs = ['brief', 'dp', 'values', 'own', 'partners', 'primitives', 'rights', 'next', 'community'];
  for (const tab of tabs) {
    assert.equal(`/on/project-liberty?tab=${tab}`.includes(`tab=${tab}`), true);
  }
});
