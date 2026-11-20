// Version 1.0 leftovers: reopened deferrals read as open with their marker; carried ones as carried, not "Modified".
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VERSION_MARKER_LABEL, versionMarkerOf } from '../src/lib/dp-v11.ts';

const REOPEN = 'Reopened for Version 1.1 (co-editors decide; carried by the steering committee on 11 to 12 Nov 2026)';

test('Gov Hub marker wins', () => {
  assert.equal(versionMarkerOf({ status: 'pending', version_marker: 'reopened_v11' }), 'reopened_v11');
  assert.equal(versionMarkerOf({ status: 'considered', version_marker: 'carried_v11' }), 'carried_v11');
});

test('older Gov Hub: read from status and note', () => {
  assert.equal(versionMarkerOf({ status: 'pending', review_note: `${REOPEN}\n\nVersion 1.0 note: Carried to Version 1.1 by the steering committee.` }), 'reopened_v11');
  assert.equal(versionMarkerOf({ status: 'considered', review_note: 'Carried to Version 1.1 by the steering committee.' }), 'carried_v11');
  assert.equal(versionMarkerOf({ status: 'considered', review_note: 'Accepted with revised wording by the steering committee.' }), null);
  assert.equal(versionMarkerOf({ status: 'declined', review_note: REOPEN }), null);
  assert.equal(versionMarkerOf({ status: 'pending' }), null);
});

test('labels', () => {
  assert.equal(VERSION_MARKER_LABEL.reopened_v11, 'Reopened for Version 1.1');
  assert.equal(VERSION_MARKER_LABEL.carried_v11, 'Carried to Version 1.1');
});
