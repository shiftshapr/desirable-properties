import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildPersonPadHref,
  resolvePersonPadLookup,
  resolvePersonPadSlug,
  slugFromLinkedInUrl,
  validatePersonPadCreateInput,
} from '../src/lib/hermes-onboard/person-pad-lookup.mjs';
import {
  discoverPersonPadCandidates,
  scorePersonNameMatch,
} from '../src/lib/hermes-onboard/person-pad-discovery.mjs';

test('slugFromLinkedInUrl normalizes profile handles', () => {
  assert.equal(slugFromLinkedInUrl('https://www.linkedin.com/in/jane-doe/'), 'jane-doe');
  assert.equal(slugFromLinkedInUrl('linkedin.com/in/jane-doe'), 'jane-doe');
  assert.equal(slugFromLinkedInUrl('https://linkedin.com/in/Jane_Doe?trk=foo'), 'jane-doe');
  assert.equal(slugFromLinkedInUrl('https://linkedin.com/company/acme'), null);
  assert.equal(slugFromLinkedInUrl('not-a-url'), null);
});

test('resolvePersonPadSlug prefers LinkedIn over name', () => {
  assert.equal(
    resolvePersonPadSlug({
      linkedinUrl: 'https://linkedin.com/in/jane-doe',
      displayName: 'Someone Else',
    }),
    'jane-doe',
  );
  assert.equal(resolvePersonPadSlug({ displayName: 'Jane Doe' }), 'jane-doe');
});

test('resolvePersonPadLookup returns href under /pad/person/', () => {
  const result = resolvePersonPadLookup('https://linkedin.com/in/jane-doe');
  assert.ok(result);
  assert.equal(result.slug, 'jane-doe');
  assert.equal(result.href, buildPersonPadHref('jane-doe'));
});

test('validatePersonPadCreateInput requires profile signal', () => {
  assert.equal(validatePersonPadCreateInput({ workLinks: ['https://example.com/paper'] }).ok, false);
  assert.equal(
    validatePersonPadCreateInput({
      linkedinUrl: 'https://linkedin.com/in/jane-doe',
      workLinks: ['https://example.com/paper'],
    }).ok,
    true,
  );
});

test('person pad file record round trip', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'person-pad-file-'));
  const dataDir = path.join(tmp, 'data', 'hermes-person-pad');
  fs.mkdirSync(dataDir, { recursive: true });

  const record = {
    slug: 'jane-doe',
    displayName: 'Jane Doe',
    linkedinUrl: 'https://linkedin.com/in/jane-doe',
    cvUrl: null,
    workLinks: ['https://example.com/paper-one'],
    perspectiveLinks: [
      {
        raw: '/perspectives/a-fork-in-the-web',
        slug: 'a-fork-in-the-web',
        href: '/perspectives/a-fork-in-the-web',
        title: 'A Fork in the Web',
        known: true,
      },
    ],
    uploadedDocs: [],
    bioText: 'Researcher focused on human-centered AI.',
    profilePaste: null,
    selectedSources: [
      {
        id: 'pci:https://ordinals.com/inscription/example',
        title: 'Meta-Layer Initiative Meeting',
        url: 'https://ordinals.com/inscription/example',
        source: 'pci',
        snippet: 'PCI email by Cindy Mason',
      },
    ],
    createdAt: '2026-08-20T00:00:00.000Z',
    updatedAt: '2026-08-20T00:00:00.000Z',
  };

  fs.writeFileSync(path.join(dataDir, 'jane-doe.json'), `${JSON.stringify(record, null, 2)}\n`);
  const loaded = JSON.parse(fs.readFileSync(path.join(dataDir, 'jane-doe.json'), 'utf8'));
  assert.equal(loaded.slug, 'jane-doe');
  assert.equal(loaded.workLinks[0], 'https://example.com/paper-one');
  assert.equal(loaded.perspectiveLinks[0].slug, 'a-fork-in-the-web');
  assert.equal(loaded.bioText, 'Researcher focused on human-centered AI.');
  assert.equal(loaded.selectedSources.length, 1);
  assert.equal(buildPersonPadHref(loaded.slug), '/pad/person/jane-doe');

  fs.rmSync(tmp, { recursive: true, force: true });
});

test('perspective URL slug extraction', () => {
  function perspectiveSlug(raw) {
    if (raw.startsWith('/perspectives/')) {
      return raw.replace(/^\/perspectives\//, '').split(/[?#]/)[0] || null;
    }
    try {
      const url = new URL(raw.startsWith('http') ? raw : `https://${raw.replace(/^\/+/, '')}`);
      const match = url.pathname.match(/\/perspectives\/([^/?#]+)/);
      return match?.[1] || null;
    } catch {
      return null;
    }
  }

  assert.equal(perspectiveSlug('/perspectives/a-fork-in-the-web'), 'a-fork-in-the-web');
  assert.equal(
    perspectiveSlug('https://desirableproperties.org/perspectives/a-fork-in-the-web'),
    'a-fork-in-the-web',
  );
  assert.equal(perspectiveSlug('https://example.com/other'), null);
});

test('scorePersonNameMatch finds author overlap', () => {
  assert.ok(scorePersonNameMatch('Cindy Mason', 'Cindy Mason') >= 95);
  assert.ok(scorePersonNameMatch('Paul Werbos', 'Paul Werbos') >= 95);
  assert.equal(scorePersonNameMatch('Anon', 'Jane Doe'), 0);
});

test('discoverPersonPadCandidates matches PCI author and roster org', () => {
  const candidates = discoverPersonPadCandidates(
    {
      displayName: 'Cindy Mason',
      orgAffiliation: 'Project Liberty',
      workLinks: ['https://example.com/paper-one'],
    },
    {
      perspectives: [
        {
          slug: 'a-fork-in-the-web',
          title: 'A Fork in the Web',
          href: '/perspectives/a-fork-in-the-web',
          deck: 'Human-centered internet perspective',
        },
      ],
      pciEmails: [
        {
          id: 'abc',
          title: 'Anticipating PCEs',
          author: 'Cindy Mason',
          subject: 'PCI thread',
          ordinals_url: 'https://ordinals.com/inscription/abc',
        },
        {
          id: 'def',
          title: 'Other thread',
          author: 'Paul Werbos',
          subject: 'PCI thread',
          ordinals_url: 'https://ordinals.com/inscription/def',
        },
      ],
      rosterOrgs: [
        {
          slug: 'project-liberty',
          name: 'Project Liberty',
          website: 'https://www.projectliberty.io/',
        },
      ],
    },
  );

  assert.ok(candidates.some((row) => row.source === 'pci' && row.title.includes('Anticipating')));
  assert.ok(candidates.some((row) => row.source === 'roster'));
  assert.ok(candidates.some((row) => row.source === 'work-link'));
  assert.ok(!candidates.some((row) => row.title.includes('Other thread')));
});

test('person create input accepts bioText and selectedSources via JSON shape', () => {
  const payload = {
    linkedinUrl: 'https://linkedin.com/in/jane-doe',
    bioText: 'Short bio',
    profilePaste: 'Longer pasted profile',
    selectedSources: [
      {
        id: 'pci:https://example.com',
        title: 'Example',
        url: 'https://example.com',
        source: 'pci',
        snippet: 'test',
      },
    ],
  };
  assert.equal(validatePersonPadCreateInput(payload).ok, true);
  assert.equal(payload.selectedSources.length, 1);
  assert.equal(payload.bioText, 'Short bio');
});
