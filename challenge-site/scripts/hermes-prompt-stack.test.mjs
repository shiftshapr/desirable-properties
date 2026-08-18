import assert from 'node:assert/strict';
import test from 'node:test';

// Keep in sync with src/lib/usePromptStack.ts pure helpers
function buildPromptStackItems(messages, messageOffsets = new Map()) {
  const items = [];
  let index = 0;
  for (const message of messages) {
    if (message.sender !== 'user') continue;
    if (message.id === 'intro') continue;
    if (message.contributionRecord) continue;
    if (!message.text.trim()) continue;
    const firstLine = message.text.split('\n')[0].trim();
    const turnId = message.id.endsWith('-u') ? message.id.slice(0, -2) : null;
    items.push({
      stackKey: `${message.id}:${index}`,
      messageId: message.id,
      turnId,
      label: firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine,
      index,
      offsetTop: messageOffsets.get(message.id) ?? 0,
    });
    index += 1;
  }
  return items;
}

function activePromptIndexFromOffsets(items, scrollTop, viewportHeight) {
  if (!items.length) return -1;
  const midpoint = scrollTop + viewportHeight * 0.35;
  let active = 0;
  for (let i = 0; i < items.length; i += 1) {
    if (items[i].offsetTop <= midpoint) active = i;
    else break;
  }
  return active;
}

test('buildPromptStackItems excludes intro and contribution records', () => {
  const messages = [
    { id: 'intro', text: 'Hello', sender: 'assistant' },
    { id: 'turn1-u', text: 'First question', sender: 'user' },
    { id: 'turn1-a', text: 'Answer', sender: 'assistant' },
    { id: 'rec-u', text: 'Submitted', sender: 'user', contributionRecord: true },
    { id: 'turn2-u', text: 'Second\nline', sender: 'user' },
    { id: 'empty-u', text: '   ', sender: 'user' },
  ];
  const items = buildPromptStackItems(messages);
  assert.equal(items.length, 2);
  assert.equal(items[0].messageId, 'turn1-u');
  assert.equal(items[0].stackKey, 'turn1-u:0');
  assert.equal(items[0].turnId, 'turn1');
  assert.equal(items[1].label, 'Second');
});

test('buildPromptStackItems keeps duplicate messageIds as separate stack entries', () => {
  const messages = [
    { id: 'dup-u', text: 'First prompt', sender: 'user' },
    { id: 'dup-u', text: 'Second prompt', sender: 'user' },
  ];
  const items = buildPromptStackItems(messages);
  assert.equal(items.length, 2);
  assert.equal(items[0].stackKey, 'dup-u:0');
  assert.equal(items[1].stackKey, 'dup-u:1');
  assert.equal(items[0].label, 'First prompt');
  assert.equal(items[1].label, 'Second prompt');
});

test('activePromptIndexFromOffsets tracks scroll midpoint', () => {
  const items = [
    { messageId: 'a-u', offsetTop: 0 },
    { messageId: 'b-u', offsetTop: 400 },
    { messageId: 'c-u', offsetTop: 800 },
  ];
  assert.equal(activePromptIndexFromOffsets(items, 0, 600), 0);
  assert.equal(activePromptIndexFromOffsets(items, 300, 600), 1);
  assert.equal(activePromptIndexFromOffsets(items, 700, 600), 2);
  assert.equal(activePromptIndexFromOffsets([], 0, 600), -1);
});
