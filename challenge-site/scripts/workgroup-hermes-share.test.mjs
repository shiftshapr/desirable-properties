import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const SHARED_HERMES_MESSAGE_RE = /^✋\s+\*Hermes \([^)]+\)\*/;

function isSharedHermesWorkgroupMessage(body) {
  return SHARED_HERMES_MESSAGE_RE.test(String(body ?? '').trimStart());
}

describe('isSharedHermesWorkgroupMessage', () => {
  it('detects shared Hermes ambient / Ask Hermes posts', () => {
    assert.equal(
      isSharedHermesWorkgroupMessage('✋ *Hermes (Observer)*\n\n## Summary\n\n**Bold** point.'),
      true,
    );
    assert.equal(
      isSharedHermesWorkgroupMessage("✋ *Hermes (Devil's advocate)*\n\nA note."),
      true,
    );
  });

  it('rejects regular member messages', () => {
    assert.equal(isSharedHermesWorkgroupMessage('Hello everyone'), false);
    assert.equal(isSharedHermesWorkgroupMessage('## Not Hermes'), false);
    assert.equal(isSharedHermesWorkgroupMessage('✋ raised hand emoji only'), false);
  });
});
