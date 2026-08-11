import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const TEASER_LIMIT = 5;

/** Mirror of emptyMessagesResponse in workgroup-membership.server.ts */
function emptyMessagesResponse(isMember, full, teaserMessages = []) {
  const messages = isMember && full ? [] : teaserMessages.slice(0, TEASER_LIMIT);
  return {
    messages,
    is_member: isMember,
    can_post: isMember,
    teaser: !isMember || !full,
    count: messages.length,
  };
}

/** Mirror of membership reconciliation when upstream disagrees with signups. */
function reconcileMembership(upstream, signupsMember) {
  if (signupsMember && !upstream.is_member) {
    return {
      ...upstream,
      is_member: true,
      can_post: upstream.can_post || true,
    };
  }
  return upstream;
}

describe('workgroup membership helpers', () => {
  it('emptyMessagesResponse returns teaser slice for non-members', () => {
    const teaser = Array.from({ length: 8 }, (_, i) => ({ id: String(i) }));
    const result = emptyMessagesResponse(false, false, teaser);
    assert.equal(result.messages.length, TEASER_LIMIT);
    assert.equal(result.is_member, false);
    assert.equal(result.teaser, true);
  });

  it('emptyMessagesResponse returns empty full list for members when full=true', () => {
    const teaser = [{ id: '1' }, { id: '2' }];
    const result = emptyMessagesResponse(true, true, teaser);
    assert.equal(result.messages.length, 0);
    assert.equal(result.is_member, true);
    assert.equal(result.can_post, true);
    assert.equal(result.teaser, false);
  });

  it('reconcileMembership upgrades is_member when signups confirm membership', () => {
    const upstream = {
      messages: [],
      is_member: false,
      can_post: false,
      teaser: true,
      count: 0,
    };
    const result = reconcileMembership(upstream, true);
    assert.equal(result.is_member, true);
    assert.equal(result.can_post, true);
  });

  it('reconcileMembership leaves upstream when already member', () => {
    const upstream = {
      messages: [{ id: 'm1' }],
      is_member: true,
      can_post: true,
      teaser: false,
      count: 1,
    };
    const result = reconcileMembership(upstream, true);
    assert.deepEqual(result, upstream);
  });
});
