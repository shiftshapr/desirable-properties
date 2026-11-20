/**
 * Stable DP broadcast unsubscribe tokens for a list of emails (for emails sent outside the site's broadcaster, e.g.
 * the ballot reminders sent through Zoho). One token per email:
 *   1. the account's dp_broadcast_preference.unsubscribe_token for that email, if there is one;
 *   2. else an existing dp_broadcast_unsubscribe row for that email (linked to the account if a user id is given and
 *      the row has none);
 *   3. else a new token, indexed in dp_broadcast_unsubscribe (with the user id when given, otherwise email-only).
 * Link: https://desirableproperties.org/api/broadcast/unsubscribe?token=<token> (GET page, or one-click POST).
 *
 * Input on stdin, one per line: `email` or `email<TAB or comma>gov-hub-user-id`. Output on stdout: JSON
 *   {"tokens":[{"email","token","userId","reused"}], "created": n, "reused": n}
 *
 * On box1, from ~/desirable-properties/challenge-site:
 *   printf 'a@example.org\n' | node --env-file=.env.local scripts/broadcast-tokens.mjs --db env [--dry-run]
 * --db <url> | env (DP_DATABASE_URL, never printed); default the box2 staging DB over the local socket.
 * --dry-run creates nothing: emails without a token come back with token null.
 */
import crypto from 'node:crypto';
import pg from 'pg';

const DEFAULT_DB = 'postgresql:///desirable_properties_staging?host=/var/run/postgresql';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function args() {
  const a = process.argv.slice(2);
  const i = a.indexOf('--db');
  return { db: i >= 0 ? a[i + 1] : null, dryRun: a.includes('--dry-run') };
}

export function parseInput(text) {
  const out = new Map();
  for (const raw of String(text).split(/\r?\n/)) {
    const [e, u] = raw.split(/[\t,]/).map((x) => (x || '').trim());
    const email = (e || '').toLowerCase();
    if (!EMAIL_RE.test(email)) continue;
    const userId = ACCOUNT_ID_RE.test(u || '') ? u : null;
    if (!out.has(email) || (userId && !out.get(email))) out.set(email, userId);
  }
  return out;
}

async function readStdin() {
  let s = '';
  for await (const chunk of process.stdin) s += chunk;
  return s;
}

async function main() {
  const { db, dryRun } = args();
  const url = db === 'env' ? process.env.DP_DATABASE_URL || process.env.DATABASE_URL || '' : String(db || DEFAULT_DB);
  if (!url) throw new Error('--db env: DP_DATABASE_URL is not set (run with node --env-file=.env.local)');
  const wanted = parseInput(await readStdin());
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  const q = (sql, params = []) => pool.query(sql, params);
  const tokens = [];
  let created = 0;
  let reused = 0;
  try {
    for (const [email, userId] of wanted) {
      const pref = await q(
        `SELECT unsubscribe_token, user_id FROM dp_broadcast_preference
         WHERE lower(trim(email)) = $1 AND unsubscribe_token IS NOT NULL ORDER BY created_at LIMIT 1`,
        [email],
      );
      if (pref.rows[0]) {
        reused++;
        tokens.push({ email, token: String(pref.rows[0].unsubscribe_token), userId: pref.rows[0].user_id || null, reused: true });
        continue;
      }
      const idx = await q(
        `SELECT token, user_id FROM dp_broadcast_unsubscribe
         WHERE lower(trim(email)) = $1 ORDER BY (user_id IS NOT NULL) DESC, created_at LIMIT 1`,
        [email],
      );
      if (idx.rows[0]) {
        const token = String(idx.rows[0].token);
        let linked = idx.rows[0].user_id || null;
        if (userId && !linked && !dryRun) {
          await q('UPDATE dp_broadcast_unsubscribe SET user_id = $2 WHERE token = $1 AND user_id IS NULL', [token, userId]);
          linked = userId;
        }
        reused++;
        tokens.push({ email, token, userId: linked, reused: true });
        continue;
      }
      if (dryRun) {
        tokens.push({ email, token: null, userId, reused: false });
        continue;
      }
      const token = crypto.randomBytes(24).toString('hex');
      await q(
        `INSERT INTO dp_broadcast_unsubscribe (token, user_id, email, created_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (token) DO NOTHING`,
        [token, userId, email],
      );
      created++;
      tokens.push({ email, token, userId, reused: false });
    }
  } finally {
    await pool.end();
  }
  process.stdout.write(JSON.stringify({ tokens, created, reused }) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`broadcast-tokens: ${err.message}`);
    process.exit(1);
  });
}
