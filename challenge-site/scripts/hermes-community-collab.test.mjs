import assert from 'node:assert/strict';
import test from 'node:test';

function isCommunityCollabThread(thread) {
  return thread?.threadKind === 'group';
}

function isCommunityOwnedThread(thread) {
  return isCommunityCollabThread(thread) && !thread?.shared;
}

function excludeOwnedFromSharedSidebar(sharedThreads, ownedThreads) {
  const ownedIds = new Set(ownedThreads.map((thread) => thread.id));
  return sharedThreads.filter((thread) => !ownedIds.has(thread.id));
}

test('community owned threads stay in My conversations when shared out', () => {
  const thread = { id: 'hermes:thread:a', threadKind: 'group', activeShareCount: 2 };
  assert.equal(isCommunityOwnedThread(thread), true);
});

test('excludeOwnedFromSharedSidebar removes duplicates after loadThread upsert', () => {
  const owned = [{ id: 'hermes:thread:teilhard', threadKind: 'group' }];
  const shared = [
    { id: 'hermes:thread:teilhard', threadKind: 'group', shared: true },
    { id: 'hermes:thread:other', shared: true },
  ];
  const filtered = excludeOwnedFromSharedSidebar(shared, owned);
  assert.deepEqual(filtered.map((row) => row.id), ['hermes:thread:other']);
});
