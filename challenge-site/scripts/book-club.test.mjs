// Overweb Book Club pad: phase by clock, default meeting, chat slugs, invite kind.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOOK_CLUB, bookClubChatSlug, bookClubPhase, currentBookClubMeeting, findBookClubMeeting } from '../src/data/book-club.ts';
import { sessionChatThreadKey } from '../src/lib/sessions/session-chat-core.ts';
import { bookClubInvite, parsePadRef } from '../src/lib/pads/pad-invite-core.ts';

const m = { id: '2026-11-30', startsAt: '2026-11-30T10:00:00-08:00', durationMin: 30 };
const at = (iso) => new Date(iso);

test('phase: before, during (10 min early to 15 min after the end), after', () => {
  assert.equal(bookClubPhase(m, at('2026-11-30T09:49:00-08:00')), 'before');
  assert.equal(bookClubPhase(m, at('2026-11-30T09:51:00-08:00')), 'during');
  assert.equal(bookClubPhase(m, at('2026-11-30T10:44:00-08:00')), 'during');
  assert.equal(bookClubPhase(m, at('2026-11-30T10:46:00-08:00')), 'after');
});

test('default meeting: under way, else next, else latest', () => {
  const a = { ...m, id: 'a', chapter: 'A', startsAt: '2026-11-30T10:00:00-08:00' };
  const b = { ...m, id: 'b', chapter: 'B', startsAt: '2026-12-07T10:00:00-08:00' };
  assert.equal(currentBookClubMeeting([b, a], at('2026-11-29T00:00:00Z')).id, 'a');
  assert.equal(currentBookClubMeeting([b, a], at('2026-11-30T18:05:00Z')).id, 'a');
  assert.equal(currentBookClubMeeting([b, a], at('2026-12-01T00:00:00Z')).id, 'b');
  assert.equal(currentBookClubMeeting([b, a], at('2027-01-01T00:00:00Z')).id, 'b');
  assert.equal(currentBookClubMeeting([], at('2027-01-01T00:00:00Z')), null);
  assert.equal(findBookClubMeeting([a, b], 'nope'), null);
});

test('every meeting has a chat thread; random slugs do not', () => {
  for (const x of BOOK_CLUB.meetings) assert.ok(sessionChatThreadKey(bookClubChatSlug(x.id)));
  assert.equal(sessionChatThreadKey('book-club-2026-13-01'), null);
  assert.equal(sessionChatThreadKey('book-club-x'), null);
  assert.equal(sessionChatThreadKey('meta-governance-2026-11-16'), 'session:meta-governance-2026-11-16');
});

test('meetings are well formed', () => {
  for (const x of BOOK_CLUB.meetings) {
    assert.match(x.id, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!Number.isNaN(new Date(x.startsAt).getTime()));
    assert.ok(x.featured.length > 0);
    for (const l of [...x.featured, ...x.extraCredit]) assert.ok(!/zoom\.us/i.test(l.href), 'no Zoom links on the pad');
  }
});

test('invite: bookclub kind parses and reads well', () => {
  assert.deepEqual(parsePadRef({ kind: 'bookclub', key: '/pads/book-club' }), { kind: 'bookclub', key: '/pads/book-club' });
  const c = bookClubInvite({ path: '/pads/book-club', title: 'Overweb Book Club', chapter: 'Front matter', dateLabel: '30 November', past: false });
  assert.equal(c.kind, 'bookclub');
  assert.match(c.summary, /Front matter/);
  assert.equal(c.action, 'Get the reading and join');
});
