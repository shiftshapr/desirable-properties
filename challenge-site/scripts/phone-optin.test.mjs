// Phone setting on /account (PHONE_OPTIN) and the public upcoming-sessions feed.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { phoneOptinEnabled } from '../src/lib/phone-optin/flag.ts';
import {
  MSG_AGREE_REQUIRED,
  MSG_ALERTS_BOX,
  MSG_PICK_CHANNEL,
  choicesError,
  govHubChannelsPayload,
  govHubStartPayload,
  normalizeCode,
  parseChoices,
  phoneCheckInWords,
  readAnnouncements,
} from '../src/lib/phone-optin/phone-core.ts';
import { upcomingFeed } from '../src/lib/sessions/upcoming-feed.ts';

const ORIGIN = 'https://desirableproperties.org';

test('PHONE_OPTIN is off unless set to on', () => {
  const before = process.env.PHONE_OPTIN;
  try {
    delete process.env.PHONE_OPTIN;
    assert.equal(phoneOptinEnabled(), false);
    process.env.PHONE_OPTIN = 'off';
    assert.equal(phoneOptinEnabled(), false);
    process.env.PHONE_OPTIN = ' ON ';
    assert.equal(phoneOptinEnabled(), true);
  } finally {
    if (before === undefined) delete process.env.PHONE_OPTIN;
    else process.env.PHONE_OPTIN = before;
  }
});

test('every /api/me/phone route checks the flag before anything else', () => {
  const dir = new URL('../src/app/api/me/phone/', import.meta.url).pathname;
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f === 'route.ts') files.push(p);
    }
  };
  walk(dir);
  assert.equal(files.length, 4);
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const handlers = src.split(/export async function (?:GET|POST|PUT|DELETE)\(/).slice(1);
    assert.ok(handlers.length > 0, f);
    for (const h of handlers) {
      const firstCall = h.slice(h.indexOf('{') + 1).trim().split('\n')[0];
      assert.match(firstCall, /phoneRouteDisabled\(\)|readPhoneMutation\(request\)/, `${f}: ${firstCall}`);
    }
  }
  const guard = readFileSync(new URL('../src/lib/phone-optin/phone-proxy.server.ts', import.meta.url), 'utf8');
  assert.match(guard, /export async function readPhoneMutation[\s\S]*?const off = phoneRouteDisabled\(\);\s*if \(off\)/);
});

test('consent wording comes from one module, shared with /text-alerts', () => {
  const page = readFileSync(new URL('../src/app/text-alerts/page.tsx', import.meta.url), 'utf8');
  const form = readFileSync(new URL('../src/components/account/AccountPhoneSettings.tsx', import.meta.url), 'utf8');
  for (const src of [page, form]) {
    assert.match(src, /import \{ CONSENT_ALERTS, CONSENT_ANNOUNCEMENTS, TextAlertsAgreeLabel \} from '@\/lib\/text-alerts-consent'/);
    assert.doesNotMatch(src, /const CONSENT_(ALERTS|ANNOUNCEMENTS)\s*=/);
    assert.doesNotMatch(src, /Up to 4 msgs a week/);
  }
  // Every box starts unticked.
  assert.deepEqual(parseChoices({}), { alerts: false, channels: [], announcements: false, agree: false });
});

test('agree box required when either text box is ticked; channels need the alerts box', () => {
  assert.equal(choicesError(parseChoices({})), null, 'a number with no texts is fine (phone check only)');
  assert.equal(choicesError(parseChoices({ alerts: true, channels: ['sms'] })), MSG_AGREE_REQUIRED);
  assert.equal(choicesError(parseChoices({ announcements: true })), MSG_AGREE_REQUIRED);
  assert.equal(choicesError(parseChoices({ alerts: true, agree: true })), MSG_PICK_CHANNEL);
  assert.equal(choicesError(parseChoices({ channels: ['sms'], agree: true })), MSG_ALERTS_BOX);
  assert.equal(choicesError(parseChoices({ alerts: true, channels: ['sms', 'bogus'], agree: true })), null);
  assert.equal(choicesError(parseChoices({ announcements: true, agree: true })), null);
  // Only real booleans count as ticked.
  assert.equal(parseChoices({ alerts: 'true', agree: 1 }).alerts, false);
});

test('Gov Hub payloads: channels, consent and the announcements choice', () => {
  const start = govHubStartPayload('+14155550123', parseChoices({ alerts: true, channels: ['sms', 'signal'], announcements: true, agree: true }));
  assert.equal(start.phone, '+14155550123');
  assert.equal(start.send_channel, 'sms');
  assert.deepEqual(start.channels, ['sms', 'signal']);
  assert.equal(start.consent, true);
  assert.equal(start.announcements, true);
  assert.equal(start.alerts_sms_promo, true);
  const none = govHubChannelsPayload(parseChoices({ agree: true }));
  assert.deepEqual(none.channels, []);
  assert.equal(none.consent, false);
  assert.equal(none.announcements, false);
  assert.equal(none.consent_version, null);
  assert.equal(normalizeCode(' 12-34 56 '), '123456');
});

test('announcements status is tolerated when Gov Hub does not have the field yet', () => {
  assert.equal(readAnnouncements({ channels: { sms: true } }), null);
  assert.equal(readAnnouncements({ alerts_sms_promo_at: null }), false);
  assert.equal(readAnnouncements({ alerts_sms_promo_at: '2026-11-23T10:00:00Z' }), true);
  assert.equal(readAnnouncements({ announcements: true }), true);
  assert.equal(readAnnouncements({ channels: { announcements: false } }), false);
});

test('phone check in plain words', () => {
  assert.match(phoneCheckInWords({ phone_check: 'passed' }), /mobile number/);
  assert.match(phoneCheckInWords({ phone_check: 'voip' }), /internet \(VoIP\)/);
  assert.match(phoneCheckInWords({ phone_check: 'other', phone_line_type: 'landline' }), /landline/);
  assert.equal(phoneCheckInWords({ phone_check: null }), 'Not confirmed yet.');
});

test('upcoming feed: next 14 days only, ISO times, absolute urls, one entry per page', () => {
  const feed = upcomingFeed(new Date('2026-11-22T12:00:00Z'), ORIGIN);
  assert.equal(feed.window_days, 14);
  const dates = feed.sessions.map((s) => s.starts_at.slice(0, 10));
  assert.deepEqual(dates, ['2026-11-23', '2026-11-30']);
  const first = feed.sessions[0];
  // 23 Nov now has its own occurrence page, which replaces the schedule entry (times as held).
  assert.equal(first.starts_at, '2026-11-23T18:02:00.000Z');
  assert.equal(first.title, 'Ballot results and the first weekly cycle');
  assert.equal(first.kind, 'listening');
  assert.equal(first.slug, 'listening-2026-11-23');
  assert.equal(first.url, `${ORIGIN}/events/listening-2026-11-23`);
  for (const s of feed.sessions) {
    assert.ok(s.url.startsWith(ORIGIN));
    assert.equal(new Date(s.starts_at).toISOString(), s.starts_at);
  }
});

test('upcoming feed: occurrence pages replace the schedule entry for the same page; open ballots listed', () => {
  const feed = upcomingFeed(new Date('2026-11-16T12:00:00Z'), ORIGIN);
  const mg = feed.sessions.filter((s) => s.url === `${ORIGIN}/events/meta-governance-2026-11-16`);
  assert.equal(mg.length, 1);
  assert.equal(mg[0].slug, 'meta-governance-2026-11-16');
  assert.equal(mg[0].register_url, 'https://luma.com/6bqcfew2');

  const voting = upcomingFeed(new Date('2026-11-21T12:00:00Z'), ORIGIN);
  assert.equal(voting.open_ballots.length, 1);
  assert.equal(voting.open_ballots[0].url, `${ORIGIN}/events/meta-governance-2026-11-16#vote`);
  assert.equal(voting.open_ballots[0].closes_at, '2026-11-23T04:00:00.000Z');
  const stopped = upcomingFeed(new Date('2026-11-21T12:00:00Z'), ORIGIN, {
    overrides: { [voting.open_ballots[0].slug]: { status: 'closed', publishedAt: null } },
  });
  assert.equal(stopped.open_ballots.length, 0);
  assert.equal(upcomingFeed(new Date('2026-11-24T12:00:00Z'), ORIGIN).open_ballots.length, 0);
});
