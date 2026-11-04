// Unread workgroup chat: Chat tab badge text and the "New messages" line.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  chatTabAriaLabel,
  formatUnreadCount,
  newestMessageId,
  pickDividerId,
  unreadForWorkgroup,
} from '../src/lib/workgroup-chat-unread.ts';

test('badge count: empty at 0, the number up to 99, then 99+', () => {
  assert.equal(formatUnreadCount(0), '');
  assert.equal(formatUnreadCount(undefined), '');
  assert.equal(formatUnreadCount(3), '3');
  assert.equal(formatUnreadCount(99), '99');
  assert.equal(formatUnreadCount(150), '99+');
});

test('Chat tab accessible name', () => {
  assert.equal(chatTabAriaLabel(0), 'Chat');
  assert.equal(chatTabAriaLabel(1), 'Chat, 1 unread message');
  assert.equal(chatTabAriaLabel(150), 'Chat, 99+ unread messages');
});

test('finds this workgroup in the unread response', () => {
  const data = { total: 5, workgroups: [{ workgroup_id: 'a', slug: 'dp1', unread: 5, first_unread_message_id: 'm1' }] };
  assert.equal(unreadForWorkgroup(data, 'a'), 5);
  assert.equal(unreadForWorkgroup(data, 'b'), 0);
  assert.equal(unreadForWorkgroup(null, 'a'), 0);
});

test('marks read up to the newest message on screen', () => {
  assert.equal(newestMessageId([]), null);
  assert.equal(newestMessageId([{ id: 'old' }, { id: 'new' }]), 'new');
});

test('the divider is decided by the first load only', () => {
  assert.equal(pickDividerId(null, 'm5', false), 'm5');
  assert.equal(pickDividerId('m5', null, true), 'm5');
  assert.equal(pickDividerId('m5', 'm9', true), 'm5');
});
