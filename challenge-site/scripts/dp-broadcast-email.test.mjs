import assert from 'node:assert/strict';
import test from 'node:test';

const GOVHUB_USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function looksLikeEmail(value) {
  const s = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

function enrichRows(rows, { govhubEmails, ticketEmails, canopiEmails }) {
  let govhub = 0;
  let canopi = 0;
  let supportTickets = 0;
  let usernameEmail = 0;
  let totalWithEmail = 0;

  const enriched = rows.map((row) => {
    if (row.email) {
      totalWithEmail += 1;
      return row;
    }
    const userId = row.userId?.trim();
    let email = null;
    if (userId && govhubEmails.has(userId)) {
      email = govhubEmails.get(userId);
      govhub += 1;
    } else if (userId && ticketEmails.has(userId)) {
      email = ticketEmails.get(userId);
      supportTickets += 1;
    } else {
      email = looksLikeEmail(row.userName);
      if (email) usernameEmail += 1;
    }
    if (!email && userId && canopiEmails.has(userId)) {
      email = canopiEmails.get(userId);
      canopi += 1;
    }
    if (email) {
      totalWithEmail += 1;
      return { ...row, email };
    }
    return row;
  });

  return {
    rows: enriched,
    stats: { govhub, canopi, supportTickets, usernameEmail, totalWithEmail, missingEmail: enriched.length - totalWithEmail },
  };
}

test('broadcast enrichment prefers Gov Hub emails over Canopi for signup user IDs', () => {
  const userId = 'be139b0e-e269-436f-866e-8944d98afacf';
  assert.match(userId, GOVHUB_USER_ID_RE);
  const { rows, stats } = enrichRows(
    [{ key: userId, userId, userName: 'Bridgit', email: null }],
    {
      govhubEmails: new Map([[userId, 'bridgit@example.com']]),
      ticketEmails: new Map(),
      canopiEmails: new Map(),
    },
  );
  assert.equal(rows[0].email, 'bridgit@example.com');
  assert.equal(stats.govhub, 1);
  assert.equal(stats.canopi, 0);
});

test('broadcast enrichment uses email-shaped userName when lookup maps miss', () => {
  const { rows, stats } = enrichRows(
    [{
      key: '0a0be7f5-b527-4227-a15c-11b177fd61cf',
      userId: '0a0be7f5-b527-4227-a15c-11b177fd61cf',
      userName: 'valeuchtmann@gmail.com',
      email: null,
    }],
    { govhubEmails: new Map(), ticketEmails: new Map(), canopiEmails: new Map() },
  );
  assert.equal(rows[0].email, 'valeuchtmann@gmail.com');
  assert.equal(stats.usernameEmail, 1);
});

test('Canopi lookup is last-resort fallback only', () => {
  const userId = '57e7c23e-29ec-423a-baee-51ddf34a8174';
  const { rows, stats } = enrichRows(
    [{ key: userId, userId, userName: 'Daveed', email: null }],
    {
      govhubEmails: new Map(),
      ticketEmails: new Map([[userId, 'daveed@support.example.com']]),
      canopiEmails: new Map([[userId, 'daveed@canopi.example.com']]),
    },
  );
  assert.equal(rows[0].email, 'daveed@support.example.com');
  assert.equal(stats.supportTickets, 1);
  assert.equal(stats.canopi, 0);
});
