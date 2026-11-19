// V1 promo data: share intents are plain prefilled URLs; unpublished videos render nothing.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  publishedVideos,
  shareIntents,
  V1_PROMO_POSTS,
  V1_PROMO_SHARE_TEXT,
  V1_PROMO_SHARE_URL,
  V1_PROMO_VIDEOS,
  youtubeEmbedUrl,
} from '../src/data/v1-promo.ts';

test('share intents carry the text and the /v1 url', () => {
  const byKey = Object.fromEntries(shareIntents().map((s) => [s.key, new URL(s.href)]));
  assert.equal(byKey.x.origin, 'https://twitter.com');
  assert.equal(byKey.x.searchParams.get('text'), V1_PROMO_SHARE_TEXT);
  assert.equal(byKey.x.searchParams.get('url'), V1_PROMO_SHARE_URL);
  assert.equal(byKey.linkedin.searchParams.get('url'), V1_PROMO_SHARE_URL);
  assert.equal(byKey.whatsapp.searchParams.get('text'), `${V1_PROMO_SHARE_TEXT} ${V1_PROMO_SHARE_URL}`);
  assert.equal(byKey.email.protocol, 'mailto:');
  assert.match(decodeURIComponent(shareIntents().find((s) => s.key === 'email').href), /desirableproperties\.org\/v1/);
});

test('videos without a youtubeId are left out', () => {
  const ids = publishedVideos().map((v) => v.key);
  assert.deepEqual(ids, ['film', 'teaser']);
  assert.equal(V1_PROMO_VIDEOS.find((v) => v.key === 'voices').youtubeId, null);
});

test('embeds use youtube-nocookie and posts are https', () => {
  assert.match(youtubeEmbedUrl('OYohHLm6JCA'), /^https:\/\/www\.youtube-nocookie\.com\/embed\/OYohHLm6JCA\?/);
  for (const p of V1_PROMO_POSTS) assert.equal(new URL(p.url).protocol, 'https:');
});
