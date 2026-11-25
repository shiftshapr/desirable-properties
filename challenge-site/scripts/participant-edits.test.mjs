// Proposed edits to a participants-page listing: what the form may send and what counts as a change.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changedParticipantFields, readParticipantEdit } from '../src/lib/participant-edits.ts';

const current = { name: 'Ada Lovelace', role: 'Contributor', headline: 'Analyst', description: 'Wrote the first notes.' };
const body = (over) => ({ slug: 'ada-lovelace', kind: 'edit', current, proposed: current, ...over });

test('an edit needs a change, a photo note or a note', () => {
  assert.equal(readParticipantEdit(body({})).error, 'no_change');
  assert.equal(readParticipantEdit(body({ note: 'Please use my married name.' })).ok, true);
  assert.equal(readParticipantEdit(body({ photoNote: 'I will send a new photo.' })).ok, true);
  const r = readParticipantEdit(body({ proposed: { ...current, role: 'Author' } }));
  assert.equal(r.ok, true);
  assert.deepEqual(changedParticipantFields(r.value.current, r.value.proposed), ['role']);
});

test('approve and remove keep the listing as shown and ignore proposed text', () => {
  for (const kind of ['approve', 'remove']) {
    const r = readParticipantEdit(body({ kind, proposed: { ...current, name: 'Someone Else' }, photoNote: 'x' }));
    assert.equal(r.ok, true);
    assert.deepEqual(r.value.proposed, current);
    assert.equal(r.value.photoNote, '');
  }
});

test('bad input is refused', () => {
  assert.equal(readParticipantEdit(body({ slug: '../etc' })).error, 'bad_slug');
  assert.equal(readParticipantEdit(body({ slug: 'Ada Lovelace' })).error, 'bad_slug');
  assert.equal(readParticipantEdit(body({ kind: 'delete' })).error, 'bad_kind');
  assert.equal(readParticipantEdit(body({ current: {} })).error, 'no_current');
  assert.equal(readParticipantEdit(body({ proposed: { ...current, name: '  ' } })).error, 'no_name');
  assert.equal(readParticipantEdit(null).ok, false);
});

test('text is trimmed, capped and stripped of control characters', () => {
  const r = readParticipantEdit(body({ proposed: { ...current, description: `  A\u0000B\r\nC  ${'x'.repeat(5000)}` } }));
  assert.equal(r.value.proposed.description.startsWith('AB\nC'), true);
  assert.equal(r.value.proposed.description.length, 2500);
});

test('a filled hidden field marks a bot', () => {
  assert.equal(readParticipantEdit(body({ note: 'hi', website: 'http://spam.example' })).bot, true);
  assert.equal(readParticipantEdit(body({ note: 'hi' })).bot, false);
});
