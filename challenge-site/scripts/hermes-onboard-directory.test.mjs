import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  resolvePadLookup,
  resolvePadSlugFromInput,
} from '../src/lib/hermes-onboard/pad-lookup.mjs';

const dirPath = path.join(process.cwd(), 'src/data/alliance-directory.json');
const rosterPath = path.join(process.cwd(), 'src/data/alliance-roster.json');
const rosterPadsPath = path.join(process.cwd(), 'src/data/alliance-roster-pads.json');

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

test('alliance slug keys are unique when hyphens are stripped', () => {
  const directory = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const keys = new Set();
  for (const org of directory.orgs) {
    const key = org.slug.replace(/-/g, '');
    assert.equal(keys.has(key), false, `duplicate slug key ${key} for ${org.slug}`);
    keys.add(key);
  }
});

test('dashless pad URLs map to canonical directory slugs', () => {
  const directory = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const findOrg = (slug) => {
    const exact = directory.orgs.find((org) => org.slug === slug);
    if (exact) return exact;
    const key = slug.replace(/-/g, '');
    return directory.orgs.find((org) => org.slug.replace(/-/g, '') === key) || null;
  };

  assert.equal(findOrg('project-liberty')?.slug, 'project-liberty');
  assert.equal(findOrg('projectliberty')?.slug, 'project-liberty');
  assert.equal(findOrg('project-liberty-institute')?.slug, 'project-liberty-institute');
  assert.equal(findOrg('projectlibertyinstitute')?.slug, 'project-liberty-institute');
  assert.equal(findOrg('unknown-org'), null);
});

test('onboard tab ids are linkable query values', () => {
  const tabs = ['brief', 'dp', 'values', 'own', 'partners', 'primitives', 'rights', 'next', 'community'];
  for (const tab of tabs) {
    assert.equal(`/pad/project-liberty?tab=${tab}`.includes(`tab=${tab}`), true);
  }
});

test('resolvePadSlugFromInput resolves slug, domain, and name variants', () => {
  const directory = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const orgs = directory.orgs;

  assert.equal(resolvePadSlugFromInput(orgs, 'project-liberty'), 'project-liberty');
  assert.equal(resolvePadSlugFromInput(orgs, 'projectliberty'), 'project-liberty');
  assert.equal(resolvePadSlugFromInput(orgs, 'Project Liberty'), 'project-liberty');
  assert.equal(resolvePadSlugFromInput(orgs, 'project-liberty-institute'), 'project-liberty-institute');
  assert.equal(resolvePadSlugFromInput(orgs, 'projectlibertyinstitute'), 'project-liberty-institute');
  assert.equal(resolvePadSlugFromInput(orgs, 'Project Liberty Institute'), 'project-liberty-institute');
  assert.equal(resolvePadSlugFromInput(orgs, 'project-liberty-labs'), 'project-liberty-labs');
  assert.equal(resolvePadSlugFromInput(orgs, 'Project Liberty Labs'), 'project-liberty-labs');
  assert.equal(resolvePadSlugFromInput(orgs, 'https://www.projectliberty.io/'), 'project-liberty');
  assert.equal(resolvePadSlugFromInput(orgs, 'projectliberty.io'), 'project-liberty');
  assert.equal(resolvePadSlugFromInput(orgs, 'unknown-org'), null);
  assert.equal(resolvePadSlugFromInput(orgs, ''), null);
});

test('alliance roster is a valid prework packet', () => {
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  assert.equal(roster.cohort, 'project-liberty-alliance');
  assert.ok(Array.isArray(roster.orgs) && roster.orgs.length >= 100);

  const slugs = new Set();
  const domains = new Set();
  for (const org of roster.orgs) {
    assert.match(org.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(slugs.has(org.slug), false, `duplicate slug ${org.slug}`);
    slugs.add(org.slug);
    assert.equal(domains.has(org.domain), false, `duplicate domain ${org.domain}`);
    domains.add(org.domain);
    assert.ok(org.name);
    assert.ok(org.website.startsWith('http'));
  }
});

test('resolvePadLookup resolves directory, roster, and dynamic website input', () => {
  const directory = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  const orgs = directory.orgs;
  const rosterOrgs = roster.orgs;

  const found = resolvePadLookup(orgs, rosterOrgs, 'project-liberty');
  assert.equal(found.status, 'found');
  assert.equal(found.slug, 'project-liberty');
  assert.equal(found.href, '/pad/project-liberty');

  const rosterMatch = resolvePadLookup(orgs, rosterOrgs, 'consumerreports.org');
  assert.equal(rosterMatch.status, 'roster');
  assert.equal(rosterMatch.slug, 'consumerreports');
  assert.equal(rosterMatch.domain, 'consumerreports.org');
  assert.equal(rosterMatch.href, '/pad/consumerreports');

  const rosterByName = resolvePadLookup(orgs, rosterOrgs, 'Consumer Reports');
  assert.equal(rosterByName.status, 'roster');
  assert.equal(rosterByName.slug, 'consumerreports');

  const dynamic = resolvePadLookup(orgs, rosterOrgs, 'https://example-random-site.org/about');
  assert.equal(dynamic.status, 'dynamic');
  assert.equal(dynamic.slug, 'example-random-site');
  assert.equal(dynamic.domain, 'example-random-site.org');
  assert.match(dynamic.href, /^\/pad\/example-random-site\?domain=/);

  const missing = resolvePadLookup(orgs, rosterOrgs, 'not a real org name at all');
  assert.equal(missing.status, 'not_found');
});

test('alliance roster pads cover every roster org outside the directory', () => {
  const directory = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  const pads = JSON.parse(fs.readFileSync(rosterPadsPath, 'utf8'));
  const directorySlugs = new Set(directory.orgs.map((org) => org.slug));

  assert.equal(pads.cohort, 'project-liberty-alliance');
  assert.ok(Array.isArray(pads.orgs) && pads.orgs.length >= 100);

  const expectedCount = roster.orgs.filter((org) => !directorySlugs.has(org.slug)).length;
  assert.equal(pads.orgs.length, expectedCount);

  const padSlugs = new Set(pads.orgs.map((org) => org.slug));
  for (const org of roster.orgs) {
    if (directorySlugs.has(org.slug)) continue;
    assert.ok(padSlugs.has(org.slug), `missing pad entry for ${org.slug}`);
    const entry = pads.orgs.find((row) => row.slug === org.slug);
    assert.ok(entry.pitch?.headline);
    assert.ok(entry.pitch?.lead);
    assert.ok(Array.isArray(entry.relatedDps) && entry.relatedDps.length > 0);
    assert.ok(entry.website.startsWith('http'));
    assert.ok(entry.domain);
  }
});

test('sample roster slugs resolve to member pad hrefs', () => {
  const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
  const directory = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const rosterOrgs = roster.orgs;
  const orgs = directory.orgs;

  for (const sample of ['consumerreports', 'epic', 'stanford']) {
    const match = resolvePadLookup(orgs, rosterOrgs, sample);
    assert.equal(match.status, 'roster', sample);
    assert.equal(match.href, `/pad/${match.slug}`);
  }
});
