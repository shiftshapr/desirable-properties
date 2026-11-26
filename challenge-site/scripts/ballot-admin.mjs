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
 * Plain Node with the alias hook (no tsx needed; production has no dev dependencies). On box1, from
 * ~/desirable-properties/challenge-site:
 *   node --experimental-strip-types --import ./scripts/ts-alias-hooks.mjs --env-file=.env.local scripts/ballot-admin.mjs results --db env
 *
 * Gov Hub as the store (PAD_VOTES_BACKEND=govhub, production and staging since 25 Nov): add --store govhub. Then
 * status, results and publish go to Gov Hub's /api/pad-votes admin API with the site's admin proxy (the key and admin
 * email from .env.local, never printed); results and publish only after the close. Gov Hub URL: --govhub-url
 * (default http://127.0.0.1:8000, production Gov Hub on box1; staging Gov Hub on box2 is http://127.0.0.1:8001).
 * The production Gov Hub (the default URL) needs --prod to publish.
 *   node --experimental-strip-types --import ./scripts/ts-alias-hooks.mjs --env-file=.env.local scripts/ballot-admin.mjs status --store govhub --slug listening-2026-11-23
 *   node --experimental-strip-types --import ./scripts/ts-alias-hooks.mjs --env-file=.env.local scripts/ballot-admin.mjs results --store govhub --slug listening-2026-11-23
 *   node --experimental-strip-types --import ./scripts/ts-alias-hooks.mjs --env-file=.env.local scripts/ballot-admin.mjs publish --store govhub --slug listening-2026-11-23 --prod
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
import { SESSION_BALLOTS } from '../src/data/sessions/ballots.ts';
import { applyApproval, checkDefinition, effectiveStatus, outcomeText, tallyBallot, withDraftNumbers } from '../src/lib/ballots/ballot-core.ts';
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
  if (opts.store === 'govhub') return govhub(cmd, opts, def);
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

/* ---------- Gov Hub as the store (counts only) ---------- */

const GOVHUB_PROD_URL = 'http://127.0.0.1:8000';

async function govhub(cmd, opts, def) {
  const base = String(opts['govhub-url'] || GOVHUB_PROD_URL).replace(/\/$/, '');
  const isProd = base === GOVHUB_PROD_URL;
  const secret = (process.env.GOVHUB_HERMES_API_KEY || '').trim()
    || (process.env.METAWEB_GOVHUB_INTERNAL_SECRET || process.env.DP_AUTH_HANDOFF_SECRET || process.env.METAWEB_OPS_SECRET || '').trim();
  const email = (process.env.PAD_VOTES_GOVHUB_ADMIN_EMAIL || '').trim().toLowerCase()
    || (process.env.DP_ADMIN_EMAILS || process.env.ONCHAIN_ADMIN_EMAILS || '').split(',')[0].trim().toLowerCase();
  const call = async (path, method = 'GET', admin = false) => {
    const headers = { Accept: 'application/json' };
    if (admin) {
      if (!secret || !email) throw new Error('admin proxy not configured: run with --env-file=.env.local');
      headers.Authorization = `Bearer ${secret}`;
      headers['X-DP-Admin-Email'] = email;
    }
    const res = await fetch(`${base}/api/pad-votes${path}`, { method, headers, signal: AbortSignal.timeout(15_000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Gov Hub ${method} ${path.split('?')[0]}: ${res.status} ${data.code || data.error || ''}`);
    return data;
  };
  const slug = encodeURIComponent(def.slug);
  const view = await call(`/ballots/dp/${slug}`).catch((err) => {
    if (/: 404/.test(err.message)) return null;
    throw err;
  });
  const status = view?.status ?? 'not registered';
  const report = (results) => {
    const r = withDraftNumbers(def, applyApproval(def, results));
    const lines = [`# ${def.title}: results`, '', `From Gov Hub ${isProd ? '(production)' : base}, status ${status}. ${r.voters} accounts voted.`, ''];
    const held = def.questions.filter((q) => !r.questions.some((x) => x.key === q.key));
    for (const q of r.questions) {
      lines.push(`## ${q.n}. ${q.question}`, '');
      for (const o of q.options) lines.push(`- ${o.label}: ${o.votes}`);
      lines.push('', `Outcome: ${outcomeText(q)} (${q.ballots} answered)`, '');
    }
    for (const q of held) lines.push(`## ${q.n}. ${q.question}`, '', 'Held back by the council: not on the ballot.', '');
    return lines.join('\n');
  };
  switch (cmd) {
    case 'status':
      console.log(JSON.stringify({
        slug: def.slug,
        govhub: isProd ? 'production' : base,
        status,
        opens_at: view?.opens_at ?? def.opensAt,
        closes_at: view?.closes_at ?? def.closesAt,
        published_at: view?.published_at ?? null,
        voters: view?.voters ?? 0,
        questions_on_ballot: (view?.questions || []).map((q) => q.key),
        definition_sha256: view?.definition_sha256 ?? null,
      }, null, 2));
      return;
    case 'results': {
      if (!view) throw new Error('Gov Hub does not hold this ballot (it registers on the first page view after it opens)');
      if (!['closed', 'counted', 'published'].includes(status)) throw new Error(`ballot is ${status}: results after the close`);
      const rep = await call(`/admin/dp/ballots/${slug}/report`, 'GET', true);
      if (!rep.results_preview) throw new Error('Gov Hub returned no count');
      const text = opts.json === true ? JSON.stringify({ ...rep.results_preview, status }, null, 2) : report(rep.results_preview);
      if (typeof opts.out === 'string') {
        writeFileSync(opts.out, text + '\n');
        console.log(`written ${opts.out}`);
      } else console.log(text);
      return;
    }
    case 'publish': {
      if (!view) throw new Error('Gov Hub does not hold this ballot');
      if (!['closed', 'counted'].includes(status)) throw new Error(`ballot is ${status}: publish after the close`);
      if (isProd && opts.prod !== true) throw new Error('publish writes to production Gov Hub: add --prod');
      const out = await call(`/admin/dp/ballots/${slug}/publish`, 'POST', true);
      console.log(`${def.slug} published ${out.ballot?.published_at}: totals now show on ${def.pagePath}#vote`);
      return;
    }
    default:
      throw new Error(`${cmd} is not available with --store govhub (status, results, publish)`);
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
