import assert from 'node:assert/strict';
import test from 'node:test';

function stripTrailingAmpSlugTypo(slug) {
  return slug.replace(/&+$/g, '');
}

function padSlugTypoRedirectPath(pathname) {
  const match = pathname.match(/^\/(?:pad|on)\/([^/]+)$/);
  if (!match) return null;
  let raw = match[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep */
  }
  const cleaned = stripTrailingAmpSlugTypo(raw);
  if (!cleaned || cleaned === raw) return null;
  const prefix = pathname.startsWith('/on/') ? '/on/' : '/pad/';
  return `${prefix}${encodeURIComponent(cleaned)}`;
}

test('padSlugTypoRedirectPath fixes americansecurity& bookmark', () => {
  assert.equal(
    padSlugTypoRedirectPath('/pad/americansecurity&'),
    '/pad/americansecurity',
  );
});

test('padSlugTypoRedirectPath fixes multiple trailing ampersands', () => {
  assert.equal(padSlugTypoRedirectPath('/pad/foo&&'), '/pad/foo');
});

test('padSlugTypoRedirectPath leaves valid slugs alone', () => {
  assert.equal(padSlugTypoRedirectPath('/pad/americansecurity'), null);
  assert.equal(padSlugTypoRedirectPath('/pad/project-liberty'), null);
});

test('padSlugTypoRedirectPath supports legacy /on/ paths', () => {
  assert.equal(padSlugTypoRedirectPath('/on/americansecurity&'), '/on/americansecurity');
});
