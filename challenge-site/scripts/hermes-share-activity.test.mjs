import assert from 'node:assert/strict';
import test from 'node:test';

function describeShareActivity(share) {
  const opened = share.recipients.filter((r) => r.role !== 'owner_watch');
  if (!opened.length) {
    const target = share.recipientEmail ? ` for ${share.recipientEmail}` : '';
    const role = share.intendedRole === 'controller' ? 'control' : 'watch';
    return [`Link sent (${role})${target} · not opened yet`];
  }
  return opened.map((recipient) => {
    const label = recipient.displayName || recipient.email || 'Someone';
    const roleLabel = recipient.hasControl
      ? 'controlling'
      : recipient.role === 'control_invited'
        ? 'invited to control (not accepted)'
        : recipient.role === 'controller'
          ? 'joined'
          : 'watching';
    return `${label} ${roleLabel}`;
  });
}

function sharesForTurn(shares, turnId) {
  if (!turnId) return [];
  return shares.filter(
    (s) => s.status === 'active' && s.anchorTurnId === turnId,
  );
}

test('sharesForTurn matches anchor_turn_id only', () => {
  const shares = [
    {
      id: 's1',
      anchorTurnId: 'turn-a',
      status: 'active',
      recipients: [],
    },
    {
      id: 's2',
      anchorTurnId: null,
      status: 'active',
      recipients: [],
    },
  ];
  assert.deepEqual(sharesForTurn(shares, 'turn-a').map((s) => s.id), ['s1']);
  assert.deepEqual(sharesForTurn(shares, 'turn-b'), []);
});

test('describeShareActivity covers pending and controlling states', () => {
  const pending = {
    intendedRole: 'controller',
    recipientEmail: 'b@example.com',
    recipients: [],
  };
  assert.match(describeShareActivity(pending)[0], /not opened yet/);

  const invited = {
    intendedRole: 'controller',
    recipientEmail: null,
    recipients: [{
      displayName: 'Brian',
      email: null,
      role: 'control_invited',
      hasControl: false,
    }],
  };
  assert.match(describeShareActivity(invited)[0], /not accepted/);

  const active = {
    intendedRole: 'controller',
    recipientEmail: null,
    recipients: [{
      displayName: 'Brian',
      email: null,
      role: 'controller',
      hasControl: true,
    }],
  };
  assert.match(describeShareActivity(active)[0], /Brian controlling/);
});
