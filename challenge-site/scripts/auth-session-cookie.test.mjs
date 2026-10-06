import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CHUNK_SIZE,
  MAX_CHUNKS,
  SESSION_COOKIE,
  chunkCookieName,
  clearedSessionCookies,
  hasSessionCookie,
  readRawSessionCookie,
  splitSessionCookies,
} from '../src/lib/auth-session-cookie.ts';

/** Simulates a browser jar: applies Set-Cookie list, drops anything over 4096 bytes. */
function jar(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    apply(cookies) {
      for (const c of cookies) {
        if (c.maxAge === 0) store.delete(c.name);
        else if (c.name.length + c.value.length <= 4096) store.set(c.name, c.value);
      }
    },
    get(name) {
      const value = store.get(name);
      return value === undefined ? undefined : { value };
    },
    names: () => [...store.keys()].sort(),
  };
}

const token = (n) => 'x'.repeat(n);

test('small session stays a single cookie', () => {
  const cookies = splitSessionCookies(token(2257), 86400);
  assert.deepEqual(cookies.map((c) => c.name), [SESSION_COOKIE, ...Array.from({ length: MAX_CHUNKS }, (_, i) => chunkCookieName(i))]);
  const j = jar();
  j.apply(cookies);
  assert.deepEqual(j.names(), [SESSION_COOKIE]);
  assert.equal(readRawSessionCookie(j), token(2257));
});

test('5.6 KB session (long Google photo URL) survives the browser cookie limit', () => {
  const big = token(5588);
  const cookies = splitSessionCookies(big, 86400);
  const j = jar();
  j.apply(cookies);
  assert.deepEqual(j.names(), [chunkCookieName(0), chunkCookieName(1)]);
  assert.ok(cookies.every((c) => c.name.length + c.value.length <= 4096));
  assert.equal(readRawSessionCookie(j), big);
  assert.equal(hasSessionCookie(j), true);
});

test('chunked write clears a stale single cookie and vice versa', () => {
  const j = jar({ [SESSION_COOKIE]: token(100) });
  j.apply(splitSessionCookies(token(CHUNK_SIZE * 2 + 1), 86400, j));
  assert.deepEqual(j.names(), [chunkCookieName(0), chunkCookieName(1), chunkCookieName(2)]);

  j.apply(splitSessionCookies(token(50), 86400, j));
  assert.deepEqual(j.names(), [SESSION_COOKIE]);
  assert.equal(readRawSessionCookie(j), token(50));
});

test('shrinking a chunked session leaves no stale trailing chunk', () => {
  const j = jar();
  j.apply(splitSessionCookies(token(CHUNK_SIZE * 3), 86400, j));
  j.apply(splitSessionCookies(token(CHUNK_SIZE * 2), 86400, j));
  assert.deepEqual(j.names(), [chunkCookieName(0), chunkCookieName(1)]);
  assert.equal(readRawSessionCookie(j), token(CHUNK_SIZE * 2));
});

test('with existing cookies known, only present stale slots are cleared', () => {
  const cookies = splitSessionCookies(token(10), 86400, jar());
  assert.deepEqual(cookies.map((c) => c.name), [SESSION_COOKIE]);
});

test('clearedSessionCookies empties every slot', () => {
  const j = jar();
  j.apply(splitSessionCookies(token(CHUNK_SIZE * 2), 86400));
  j.apply(clearedSessionCookies());
  assert.deepEqual(j.names(), []);
  assert.equal(hasSessionCookie(j), false);
});

test('absurdly large session is rejected instead of half-written', () => {
  assert.throws(() => splitSessionCookies(token(CHUNK_SIZE * MAX_CHUNKS + 1), 86400), /too large/);
});
