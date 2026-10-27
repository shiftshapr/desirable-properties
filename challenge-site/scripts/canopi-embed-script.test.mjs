import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DP_CANOPI_EMBED_SCRIPT,
  DP_CANOPI_EMBED_SCRIPT_STAGING,
  canopiEmbedScriptForHost,
} from '../src/lib/canopi-embed.ts';

test('staging hosts load the embed from staging Canopi', () => {
  assert.equal(canopiEmbedScriptForHost('staging.desirableproperties.org'), DP_CANOPI_EMBED_SCRIPT_STAGING);
  assert.equal(DP_CANOPI_EMBED_SCRIPT_STAGING, 'https://staging.api.canopi.live/embed/v1.js');
});

test('production and anything else keep production Canopi', () => {
  for (const host of ['desirableproperties.org', 'www.desirableproperties.org', 'localhost', '', 'notstaging.example.org']) {
    assert.equal(canopiEmbedScriptForHost(host), DP_CANOPI_EMBED_SCRIPT, host);
  }
});
