// DP workgroup relay spec B.2: email-relay messages render sanitized markdown,
// a "via email" label, attachments, and a Canopi profile link for the author.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  RelayAuthorName,
  RelayMessageContent,
  ViaEmailLabel,
  formatAttachmentSize,
  isEmailRelayMessage,
  normalizeRelayAttachments,
  relayAttachmentHref,
  relayMarkdown,
} from '../src/lib/workgroup-relay-message.ts';
import { resolveCanopiProfileChain } from '../src/lib/canopi-profile-chain.ts';

const render = (node) => renderToStaticMarkup(node);

test('only email-relay messages are relay messages', () => {
  assert.equal(isEmailRelayMessage({ source_channel: 'email-relay' }), true);
  assert.equal(isEmailRelayMessage({ source_channel: 'gov-hub' }), false);
  assert.equal(isEmailRelayMessage({ source_channel: 'agent-rep' }), false);
  assert.equal(isEmailRelayMessage({}), false);
  assert.equal(isEmailRelayMessage(null), false);
});

test('markdown: script tags, event handlers and raw HTML are dropped', () => {
  const html = render(relayMarkdown([
    'Intro <script>alert(1)</script> text',
    '',
    '<img src=x onerror="alert(1)">',
    '',
    '<div onclick="steal()">raw block</div>',
    '',
    '![tracker](https://evil.example/pixel.png)',
  ].join('\n')));
  // Tags are removed; the inline script's text stays as inert plain text.
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /&lt;script/i);
  assert.doesNotMatch(html, /onerror/i);
  assert.doesNotMatch(html, /onclick/i);
  assert.doesNotMatch(html, /<img/i);
  assert.doesNotMatch(html, /<div/i);
  assert.doesNotMatch(html, /evil\.example/);
  assert.match(html, /Intro/);
  assert.match(html, /tracker/);
});

test('markdown: links open in a new tab with noopener, javascript: removed', () => {
  const html = render(relayMarkdown('[post](https://canopi.live/p/x/posts/1) and [bad](javascript:alert(1))'));
  assert.match(html, /<a href="https:\/\/canopi\.live\/p\/x\/posts\/1" target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /javascript:/i);
});

test('markdown: paragraphs, lists, quotes, bold', () => {
  const html = render(relayMarkdown('**Ada** shared notes on DP13 by email:\n\n- one\n- two\n\n> quoted\n\nLast.'));
  assert.match(html, /<strong[^>]*>Ada<\/strong>/);
  assert.match(html, /<ul[^>]*>\s*<li[^>]*>one<\/li>/);
  assert.match(html, /<blockquote/);
});

test('attachment sizes', () => {
  assert.equal(formatAttachmentSize(512), '512 B');
  assert.equal(formatAttachmentSize(14 * 1024), '14 KB');
  assert.equal(formatAttachmentSize(2.3 * 1024 * 1024), '2.3 MB');
  assert.equal(formatAttachmentSize(15 * 1024 * 1024), '15 MB');
  assert.equal(formatAttachmentSize(null), '');
  assert.equal(formatAttachmentSize(-1), '');
});

test('attachments: proxied download path; bad urls dropped', () => {
  const [a, b, c] = normalizeRelayAttachments([
    { id: 'att1', filename: 'notes.pdf', size: 2048, url: '/api/workgroups/wg/messages/m/attachments/att1' },
    { filename: 'x.docx', size: '10', url: 'javascript:alert(1)' },
    { filename: 'y.png', url: '//evil.example/y.png' },
    null,
    { size: 3 },
  ]);
  assert.equal(relayAttachmentHref('wg1', 'msg1', a), '/api/workgroups/wg1/messages/msg1/attachments/att1');
  assert.equal(b.size, 10);
  assert.equal(relayAttachmentHref('wg1', 'msg1', b), null);
  assert.equal(relayAttachmentHref('wg1', 'msg1', c), null);
});

test('relay content: markdown body plus attachment list with names and sizes', () => {
  const html = render(h(RelayMessageContent, {
    workgroupId: 'wg1',
    messageId: 'msg1',
    body: 'See **attached**.',
    attachments: [
      { id: 'att1', filename: 'Case <study>.pdf', size: 1536000, url: '/x' },
      { id: 'att2', filename: 'diagram.png', size: 900, url: '/y' },
    ],
  }));
  assert.match(html, /data-relay="email"/);
  assert.match(html, /<strong[^>]*>attached<\/strong>/);
  assert.match(html, /href="\/api\/workgroups\/wg1\/messages\/msg1\/attachments\/att1"/);
  assert.match(html, /Case &lt;study&gt;\.pdf/);
  assert.match(html, /1\.5 MB/);
  assert.match(html, /900 B/);
  assert.match(html, /aria-label="Attachments"/);
});

test('relay content: no attachments, no list', () => {
  const html = render(h(RelayMessageContent, { workgroupId: 'wg1', messageId: 'msg1', body: 'Hi', attachments: [] }));
  assert.doesNotMatch(html, /Attachments/);
});

test('"via email" label', () => {
  assert.match(render(h(ViaEmailLabel)), />via email</);
});

test('author name links to the Canopi profile only when one was resolved', () => {
  const linked = render(h(RelayAuthorName, { name: 'Ada Lovelace', profileUrl: 'https://canopi.live/p/ada' }));
  assert.match(linked, /<a href="https:\/\/canopi\.live\/p\/ada" target="_blank" rel="noopener noreferrer"[^>]*>Ada Lovelace<\/a>/);
  const plain = render(h(RelayAuthorName, { name: 'Ada Lovelace', profileUrl: null }));
  assert.doesNotMatch(plain, /<a /);
  assert.match(plain, />Ada Lovelace</);
  assert.doesNotMatch(render(h(RelayAuthorName, { name: 'X', profileUrl: 'javascript:alert(1)' })), /<a /);
});

/** Canopi lookups where only the display name "Ada Lovelace" matches someone. */
function nameOnlyLookups(calls) {
  return {
    byHandle: async (x) => { calls.push(['handle', x]); return null; },
    byEmail: async (x) => { calls.push(['email', x]); return null; },
    byDisplayName: async (x) => {
      calls.push(['name', x]);
      return x === 'Ada Lovelace' ? { profileUrl: 'https://canopi.live/p/someone-else' } : null;
    },
  };
}

test('relay author whose only match is by display name renders unlinked', async () => {
  const calls = [];
  const person = { handle: 'ada', email: 'ada@example.org', displayName: 'Ada Lovelace' };
  const profile = await resolveCanopiProfileChain(person, nameOnlyLookups(calls), { allowNameMatch: false });
  assert.equal(profile, null);
  assert.deepEqual(calls, [['handle', 'ada'], ['email', 'ada@example.org']]);
  const html = render(h(RelayAuthorName, { name: 'Ada Lovelace', profileUrl: profile?.profileUrl ?? null }));
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /someone-else/);
});

test('relay author: handle or email match still links', async () => {
  const byEmail = await resolveCanopiProfileChain(
    { handle: 'ada', email: 'ada@example.org' },
    {
      byHandle: async () => null,
      byEmail: async (e) => (e === 'ada@example.org' ? { profileUrl: 'https://canopi.live/p/ada' } : null),
      byDisplayName: async () => { throw new Error('name lookup must not run'); },
    },
    { allowNameMatch: false },
  );
  assert.equal(byEmail.profileUrl, 'https://canopi.live/p/ada');
});

test('roster chain keeps the display-name fallback', async () => {
  const calls = [];
  const profile = await resolveCanopiProfileChain(
    { displayName: 'Ada Lovelace' },
    nameOnlyLookups(calls),
    { allowNameMatch: true },
  );
  assert.equal(profile.profileUrl, 'https://canopi.live/p/someone-else');
});
