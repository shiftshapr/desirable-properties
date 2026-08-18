import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const WORKGROUP_SHARE_FACILITATOR_POSITIONS = new Set(['chair', 'co_lead', 'facilitator']);
const SHARED_HERMES_MESSAGE_RE = /^✋\s+\*Hermes \([^)]+\)\*/;

function isWorkgroupShareFacilitator(positions) {
  return positions.some((p) => WORKGROUP_SHARE_FACILITATOR_POSITIONS.has(p));
}

function canMemberShareMessage(message, sharerUserId, positions) {
  if (isWorkgroupShareFacilitator(positions)) return true;
  if (message.author_user_id === sharerUserId) return true;
  return SHARED_HERMES_MESSAGE_RE.test(String(message.body ?? '').trimStart());
}

function canGrantWorkgroupShareControl(message, sharerUserId, positions) {
  if (isWorkgroupShareFacilitator(positions)) return true;
  return message.author_user_id === sharerUserId;
}

describe('workgroup share restrictions', () => {
  it('treats leadership and facilitator positions as facilitators', () => {
    assert.equal(isWorkgroupShareFacilitator(['chair']), true);
    assert.equal(isWorkgroupShareFacilitator(['co_lead']), true);
    assert.equal(isWorkgroupShareFacilitator(['facilitator']), true);
    assert.equal(isWorkgroupShareFacilitator(['editor']), false);
  });

  it('allows members to share own messages and Hermes shared posts', () => {
    const own = { author_user_id: 'u1', body: 'hello' };
    const hermes = { author_user_id: 'u2', body: '✋ *Hermes (Facilitator)*\n\nNote' };
    const other = { author_user_id: 'u2', body: 'not mine' };

    assert.equal(canMemberShareMessage(own, 'u1', []), true);
    assert.equal(canMemberShareMessage(hermes, 'u1', []), true);
    assert.equal(canMemberShareMessage(other, 'u1', []), false);
    assert.equal(canMemberShareMessage(other, 'u9', ['chair']), true);
  });

  it('limits control grants to facilitators or message authors', () => {
    const msg = { author_user_id: 'u1' };
    assert.equal(canGrantWorkgroupShareControl(msg, 'u1', []), true);
    assert.equal(canGrantWorkgroupShareControl(msg, 'u2', []), false);
    assert.equal(canGrantWorkgroupShareControl(msg, 'u2', ['facilitator']), true);
  });
});
