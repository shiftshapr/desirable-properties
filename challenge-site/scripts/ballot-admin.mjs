/**
 * Session ballots: status, early stop, results and publishing (see src/lib/ballots/ballot-core.ts).
 * Opening and closing need no command: the window (opensAt..closesAt) is in the ballot definition.
 *
 *   node --experimental-strip-types scripts/ballot-admin.mjs status
 *   node --experimental-strip-types scripts/ballot-admin.mjs results [--json] [--out file] [--preview]   # totals; after the close
 *   node --experimental-strip-types scripts/ballot-admin.mjs publish                                     # totals appear on the session page
 *   node --experimental-strip-types scripts/ballot-admin.mjs close                                       # emergency stop before closesAt
 *   node --experimental-strip-types scripts/ballot-admin.mjs reopen                                      # undo close/publish (window still applies)
 *   node --experimental-strip-types scripts/ballot-admin.mjs clear-test-votes                            # staging only
 *   node --experimental-strip-types scripts/ballot-admin.mjs attribution [--json]                        # voters per message tag / referral
 *   node --experimental-strip-types scripts/ballot-admin.mjs attribution --signups [--since 2026-11-22]  # accounts per tag / referral
 *
 * Plain Node (no tsx needed; production has no dev dependencies). On box1, from ~/desirable-properties/challenge-site:
 *   node --experimental-strip-types --env-file=.env.local scripts/ballot-admin.mjs results --db env
 *
 * Options: --slug (default meta-governance-2026-11-16), --db <url> | env (default the box2 staging DB over the local
 * socket, postgresql:///desirable_properties_staging?host=/var/run/postgresql; `env` = DP_DATABASE_URL from the
 * environment, never printed), --by <name> (recorded as updated_by).
 * The production database (desirable_properties) needs --prod on every command that writes, and refuses
 * `results --preview` (totals before the close) and `clear-test-votes` outright.
 * No command prints how an account voted: totals only. `attribution` prints counts per tag and referral only, never
 * an account next to a tag; it is read-only and safe on production while the ballot is open.
 */
import { writeFileSync } from 'fs';
import pg from 'pg';
import { SESSION_BALLOTS } from '../src/data/sessions/2026-11-16-ballot.ts';
import { checkDefinition, effectiveStatus, outcomeText, tallyBallot } from '../src/lib/ballots/ballot-core.ts';
import { BALLOT_SCHEMA_SQL } from '../src/lib/ballots/ballot-schema.ts';

const PRODUCTION_DB_NAME = 'desirable_properties';
const DEFAULT_DB = 'postgresql:///desirable_properties_staging?host=/var/run/postgresql';
const WRITES = new Set(['close', 'reopen', 'publish', 'clear-test-votes']);

function args() {
  const [cmd = 'status', ...rest] = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      opts[a.slice(2)] = next;
      i++;
    } else opts[a.slice(2)] = true;
  }
  return { cmd, opts };
}

function dbName(url) {
  try {
    return decodeURIComponent(new URL(url.replace(/^postgres(ql)?:\/\/\//, 'postgresql://localhost/')).pathname.slice(1));
  } catch {
    return '';
  }
}

async function main() {
  const { cmd, opts } = args();
  const slug = String(opts.slug || 'meta-governance-2026-11-16');
  const def = SESSION_BALLOTS[slug];
  if (!def) throw new Error(`unknown ballot ${slug}`);
  const problems = checkDefinition(def);
  if (problems.length) throw new Error(`ballot definition: ${problems.join('; ')}`);
  const url = opts.db === 'env' ? process.env.DP_DATABASE_URL || process.env.DATABASE_URL || '' : String(opts.db || DEFAULT_DB);
  if (!url) throw new Error('--db env: DP_DATABASE_URL is not set (run with node --env-file=.env.local)');
  const isProd = dbName(url) === PRODUCTION_DB_NAME;
  if (isProd && WRITES.has(cmd) && opts.prod !== true) throw new Error(`${cmd} writes to the production database: add --prod`);
  const by = String(opts.by || process.env.USER || 'ballot-admin');
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  const q = (sql, params = []) => pool.query(sql, params);
  const has = async (t) => Boolean((await q(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${t}`])).rows[0]?.ok);
  const override = async () => {
    if (!(await has('dp_ballot'))) return null;
    const row = (await q('SELECT status, published_at FROM dp_ballot WHERE slug = $1', [slug])).rows[0];
    return row ? { status: row.status, publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null } : null;
  };
  const voteRows = async () =>
    (await has('dp_ballot_vote'))
      ? (await q('SELECT question_key, option_key, user_id FROM dp_ballot_vote WHERE ballot_slug = $1', [slug])).rows
      : [];
  const setOverride = async (status) => {
    await q(BALLOT_SCHEMA_SQL);
    await q(
      `INSERT INTO dp_ballot (slug, status, closed_at, published_at, updated_by)
       VALUES ($1, $2, now(), CASE WHEN $2 = 'published' THEN now() END, $3)
       ON CONFLICT (slug) DO UPDATE SET status = EXCLUDED.status, closed_at = COALESCE(dp_ballot.closed_at, now()),
         published_at = CASE WHEN EXCLUDED.status = 'published' THEN now() ELSE dp_ballot.published_at END,
         updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [slug, status, by],
    );
  };

  try {
    const now = new Date();
    const status = effectiveStatus(def, await override(), now);
    switch (cmd) {
      case 'status': {
        const rows = await voteRows();
        console.log(
          JSON.stringify(
            {
              slug,
              database: dbName(url),
              status,
              opens_at: def.opensAt,
              closes_at: def.closesAt,
              override: await override(),
              accounts_voted: new Set(rows.map((r) => r.user_id)).size,
            },
            null,
            2,
          ),
        );
        break;
      }
      case 'close':
        await setOverride('closed');
        console.log(`${slug}: voting stopped`);
        break;
      case 'reopen':
        if (await has('dp_ballot')) await q('DELETE FROM dp_ballot WHERE slug = $1', [slug]);
        console.log(`${slug}: override removed; status now ${effectiveStatus(def, null, now)}`);
        break;
      case 'publish':
        if (status === 'open' || status === 'not_open') throw new Error(`ballot is ${status}: publish after the close`);
        await setOverride('published');
        console.log(`${slug} published: totals now show on ${def.pagePath}#vote`);
        break;
      case 'results': {
        if (status === 'open' || status === 'not_open') {
          if (opts.preview !== true) throw new Error(`ballot is ${status}: results after the close (staging: --preview)`);
          if (isProd) throw new Error('--preview is refused on the production database');
        }
        const results = tallyBallot(def, await voteRows());
        const report = { ...results, database: dbName(url), status, closes_at: def.closesAt, counted_at: now.toISOString() };
        let text;
        if (opts.json === true) text = JSON.stringify(report, null, 2);
        else {
          const lines = [
            `# ${def.title}: results`,
            '',
            `Counted ${report.counted_at} from ${report.database} (status ${status}; close ${def.closesAt}).`,
            `${results.voters} accounts voted. Plurality; Yes/No passes with more Yes than No; Abstain counted, does not decide; no quorum.`,
            '',
          ];
          for (const r of results.questions) {
            lines.push(`## ${r.n}. ${r.question}`, '');
            for (const o of r.options) lines.push(`- ${o.label}: ${o.votes}`);
            lines.push('', `Outcome: ${outcomeText(r)} (${r.ballots} answered)`, '');
          }
          text = lines.join('\n');
        }
        if (typeof opts.out === 'string') {
          writeFileSync(opts.out, text + '\n');
          console.log(`written ${opts.out}`);
        } else console.log(text);
        break;
      }
      case 'clear-test-votes': {
        if (isProd) throw new Error('refused on the production database');
        const r = (await has('dp_ballot_vote')) ? await q('DELETE FROM dp_ballot_vote WHERE ballot_slug = $1', [slug]) : null;
        if (await has('dp_ballot_vote_attribution')) await q('DELETE FROM dp_ballot_vote_attribution WHERE ballot_slug = $1', [slug]);
        console.log(`deleted ${r?.rowCount ?? 0} test votes`);
        break;
      }
      case 'attribution': {
        const report = opts.signups === true ? await signupAttribution(q, has, opts) : await voteAttribution(q, has, slug);
        report.database = dbName(url);
        if (opts.json === true) console.log(JSON.stringify(report, null, 2));
        else console.log(attributionText(report).join('\n'));
        break;
      }
      default:
        throw new Error(`unknown command ${cmd}`);
    }
  } finally {
    await pool.end();
  }
}

/* ---------- attribution (counts only) ---------- */

const groupSql = (table, col, where) =>
  `SELECT ${col} AS key, count(*)::int AS n FROM ${table} WHERE ${where} GROUP BY ${col} ORDER BY n DESC, ${col} NULLS LAST`;
const rowsOut = (rows) => rows.map((r) => ({ key: r.key ?? null, voters: Number(r.n) }));

async function voteAttribution(q, has, slug) {
  const voters = (await has('dp_ballot_vote'))
    ? Number((await q('SELECT count(DISTINCT user_id)::int AS n FROM dp_ballot_vote WHERE ballot_slug = $1', [slug])).rows[0].n)
    : 0;
  const report = { kind: 'ballot', slug, voters, recorded: 0, first_ref: [], last_ref: [], referral_code: [] };
  if (!(await has('dp_ballot_vote_attribution'))) return report;
  // Only accounts that still have a vote on this ballot.
  const where = `ballot_slug = $1 AND EXISTS (SELECT 1 FROM dp_ballot_vote v WHERE v.ballot_slug = a.ballot_slug AND v.user_id = a.user_id)`;
  const t = 'dp_ballot_vote_attribution a';
  report.recorded = Number((await q(`SELECT count(*)::int AS n FROM ${t} WHERE ${where}`, [slug])).rows[0].n);
  for (const col of ['first_ref', 'last_ref', 'referral_code']) report[col] = rowsOut((await q(groupSql(t, col, where), [slug])).rows);
  return report;
}

async function signupAttribution(q, has, opts) {
  const since = typeof opts.since === 'string' ? opts.since : '1970-01-01';
  if (Number.isNaN(Date.parse(since))) throw new Error('--since: a date, e.g. 2026-11-22');
  const report = { kind: 'signups', since, recorded: 0, first_ref: [], last_ref: [], referral_code: [] };
  if (!(await has('dp_account_attribution'))) return report;
  const where = 'first_signin_at >= $1::timestamptz';
  const t = 'dp_account_attribution';
  report.recorded = Number((await q(`SELECT count(*)::int AS n FROM ${t} WHERE ${where}`, [since])).rows[0].n);
  for (const col of ['first_ref', 'last_ref', 'referral_code']) report[col] = rowsOut((await q(groupSql(t, col, where), [since])).rows);
  return report;
}

// "em-1122-closes: 4 voters". Counts only, never names.
function countLines(title, rows, noun, empty = '(no tag)') {
  const lines = [`${title}:`];
  if (!rows.length) lines.push('  (none yet)');
  for (const r of rows) lines.push(`  ${r.key ?? empty}: ${r.voters} ${r.voters === 1 ? noun.replace(/s$/, '') : noun}`);
  return lines;
}

function attributionText(r) {
  const noun = r.kind === 'ballot' ? 'voters' : 'accounts';
  const lines =
    r.kind === 'ballot'
      ? [
          `# ${r.slug}: how voters arrived (${r.database})`,
          `${r.voters} accounts voted; ${r.recorded} first submitted after attribution started (the rest voted earlier, no record).`,
        ]
      : [`# DP sign-ins with an arrival record since ${r.since} (${r.database})`, `${r.recorded} accounts.`];
  lines.push('');
  lines.push(...countLines('By first message tag', r.first_ref, noun), '');
  lines.push(...countLines('By latest message tag', r.last_ref, noun), '');
  lines.push(...countLines('By Canopi referral', r.referral_code, noun, '(no referral)'));
  return lines;
}

main().catch((err) => {
  console.error(`ballot-admin: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
