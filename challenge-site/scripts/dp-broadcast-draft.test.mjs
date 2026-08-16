import assert from 'node:assert/strict';
import test from 'node:test';

const EMPTY_HTML = ['', '<p><br></p>', '<p></p>', '<p><br/></p>'];

function isBroadcastDraftEmpty(subject, html) {
  const subj = String(subject || '').trim();
  const body = String(html || '').trim();
  return !subj && (!body || EMPTY_HTML.includes(body));
}

function hasBroadcastDraftPrefs(draft) {
  return Boolean(
    String(draft.testEmail || '').trim() ||
      (Array.isArray(draft.selected) && draft.selected.length > 0) ||
      (Array.isArray(draft.selectedWorkgroups) && draft.selectedWorkgroups.length > 0) ||
      String(draft.memberSearch || '').trim() ||
      (draft.cohortFilter && draft.cohortFilter !== 'all') ||
      (draft.patchFilter && draft.patchFilter !== 'all') ||
      (draft.dpScope && draft.dpScope !== 'all') ||
      String(draft.dpId || '').trim(),
  );
}

function shouldPersistBroadcastDraft(draft) {
  const fontId = String(draft.fontId || 'default');
  const hasContent = !isBroadcastDraftEmpty(draft.subject, draft.html) || fontId !== 'default';
  return hasContent || hasBroadcastDraftPrefs(draft);
}

const emptyDraft = {
  subject: '',
  html: '',
  fontId: 'default',
  testEmail: '',
  selected: [],
  selectedWorkgroups: [],
  memberSearch: '',
  cohortFilter: 'all',
  patchFilter: 'all',
  dpScope: 'all',
  dpId: '',
};

test('broadcast draft persists when only test email is set', () => {
  assert.equal(shouldPersistBroadcastDraft({ ...emptyDraft, testEmail: 'user@example.com' }), true);
});

test('broadcast draft persists cohort filter without compose content', () => {
  assert.equal(
    shouldPersistBroadcastDraft({ ...emptyDraft, cohortFilter: 'isoc_nevada' }),
    true,
  );
});

test('broadcast draft empty check ignores default blank html variants', () => {
  assert.equal(isBroadcastDraftEmpty('', '<p><br></p>'), true);
  assert.equal(isBroadcastDraftEmpty('', '<p>Hello</p>'), false);
});
