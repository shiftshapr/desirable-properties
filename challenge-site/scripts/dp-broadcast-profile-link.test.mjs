import assert from 'node:assert/strict';
import test from 'node:test';

function canopiAppBase() {
  return (process.env.CANOPI_APP_BASE?.trim() || 'https://app.canopi.live').replace(/\/$/, '');
}

function handleFromUserName(userName) {
  const raw = String(userName || '').trim();
  if (raw.startsWith('@')) return raw.replace(/^@+/, '');
  return null;
}

function canopiProfileLinkForRow(row) {
  const handle = String(row.canopiHandle || handleFromUserName(row.userName) || '')
    .trim()
    .replace(/^@+/, '');
  if (!handle) return '';
  return `${canopiAppBase()}/p/${encodeURIComponent(handle)}`;
}

function applyProfileLink(template, row) {
  const profileLink = canopiProfileLinkForRow(row);
  return template.replace(/\{profileLink\}/gi, profileLink).replace(/\{profile link\}/gi, profileLink);
}

test('profileLink merge uses Canopi handle from row', () => {
  const out = applyProfileLink('Visit {profileLink}', { canopiHandle: 'daveed', userName: 'Daveed' });
  assert.equal(out, 'Visit https://app.canopi.live/p/daveed');
});

test('profileLink merge falls back to @userName handle', () => {
  const out = applyProfileLink('{profile link}', { userName: '@alex' });
  assert.equal(out, 'https://app.canopi.live/p/alex');
});

test('profileLink merge is empty when handle unknown', () => {
  const out = applyProfileLink('Link: {profileLink}', { userName: 'Daveed' });
  assert.equal(out, 'Link: ');
});
