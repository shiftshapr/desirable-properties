// A missing Web3Auth client ID must fail loudly. A hardcoded production default once
// let staging run on production's client ID without anyone noticing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { getWeb3AuthClientId, getWeb3AuthPublicConfig } from '../src/lib/web3auth-config.ts';

const PROD_ID =
  'BKvRj4akAwrNHHk4UyYCC4zt9KWigdiuosCX5-idVNclsk9hPPQ4_b8grcl0JF4NhT26oLWb3O5K949SVv6lTGk';
const STAGING_ID =
  'BL4DIH0p1zqK3qT6GfVIL4V7YIuIlo5po89t5CgkyxnhRYAZOHg4Gs3huxO63UFloj9uJ9LRkbD8n8Ha3FhR2a4';

function withEnv(value, fn) {
  const prev = process.env.WEB3AUTH_CLIENT_ID_DEVNET;
  if (value === undefined) delete process.env.WEB3AUTH_CLIENT_ID_DEVNET;
  else process.env.WEB3AUTH_CLIENT_ID_DEVNET = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.WEB3AUTH_CLIENT_ID_DEVNET;
    else process.env.WEB3AUTH_CLIENT_ID_DEVNET = prev;
  }
}

test('unset or blank client ID throws instead of falling back', () => {
  for (const value of [undefined, '', '   ']) {
    withEnv(value, () => {
      assert.throws(() => getWeb3AuthClientId(), /WEB3AUTH_CLIENT_ID_DEVNET is not set/);
      assert.throws(() => getWeb3AuthPublicConfig(), /WEB3AUTH_CLIENT_ID_DEVNET is not set/);
    });
  }
});

test('set client ID is used as given (trimmed)', () => {
  withEnv(`  ${STAGING_ID}\n`, () => {
    assert.equal(getWeb3AuthClientId(), STAGING_ID);
    assert.equal(getWeb3AuthPublicConfig().clientId, STAGING_ID);
    assert.equal(getWeb3AuthPublicConfig().web3AuthNetwork, 'sapphire_devnet');
  });
});

test('no client ID literal in app source', () => {
  const res = spawnSync(
    'git',
    ['grep', '-l', '-e', PROD_ID, '-e', STAGING_ID, '--', 'src'],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
  );
  // git grep exits 1 when nothing matches, 0 on a match, >1 on error.
  assert.equal(res.status, 1, `client ID literal found in src: ${res.stdout}${res.stderr}`);
});

test('each PM2 config carries only its own environment\'s client ID', () => {
  const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const prod = read('ecosystem.config.js');
  const staging = read('ecosystem.staging.config.js');
  assert.ok(prod.includes(`WEB3AUTH_CLIENT_ID_DEVNET: '${PROD_ID}'`));
  assert.ok(!prod.includes(STAGING_ID));
  assert.ok(staging.includes(`WEB3AUTH_CLIENT_ID_DEVNET: '${STAGING_ID}'`));
  assert.ok(!staging.includes(PROD_ID));
});
