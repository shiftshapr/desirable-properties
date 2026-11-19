/**
 * Session ballots: status, early stop, results and publishing (see src/lib/ballots/ballot-core.ts).
 * Opening and closing need no command: the window (opensAt..closesAt) is in the ballot definition.
 *
 *   npx tsx scripts/ballot-admin.ts status
 *   npx tsx scripts/ballot-admin.ts results [--json] [--out file] [--preview]   # totals; after the close
 *   npx tsx scripts/ballot-admin.ts publish                                     # totals appear on the session page
 *   npx tsx scripts/ballot-admin.ts close                                       # emergency stop before closesAt
 *   npx tsx scripts/ballot-admin.ts reopen                                      # undo close/publish (window still applies)
 *   npx tsx scripts/ballot-admin.ts clear-test-votes                            # staging only
 *
 * Options: --slug (default meta-governance-2026-11-16), --db <url> (default the box2 staging DB over the local socket,
 * postgresql:///desirable_properties_staging?host=/var/run/postgresql), --by <name> (recorded as updated_by).
 * The production database (desirable_properties) needs --prod on every command that writes, and refuses
 * `results --preview` (totals before the close) and `clear-test-votes` outright.
 * No command prints how an account voted: totals only.
 */
import { writeFileSync } from 'fs';
import pg from 'pg';
import { SESSION_BALLOTS } from '../src/data/sessions/2026-11-16-ballot';
import { checkDefinition, effectiveStatus, outcomeText, tallyBallot, type BallotOverride } from '../src/lib/ballots/ballot-core';
import { BALLOT_SCHEMA_SQL } from '../src/lib/ballots/ballot-schema';

const PRODUCTION_DB_NAME = 'desirable_properties';
const DEFAULT_DB = 'postgresql:///desirable_properties_staging?host=/var/run/postgresql';
const WRITES = new Set(['close', 'reopen', 'publish', 'clear-test-votes']);

function args() {
  const [cmd = 'status', ...rest] = process.argv.slice(2);
  const opts: Record<string, string | true> = {};
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

function dbName(url: string): string {
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
  const url = String(opts.db || DEFAULT_DB);
  const isProd = dbName(url) === PRODUCTION_DB_NAME;
  if (isProd && WRITES.has(cmd) && opts.prod !== true) throw new Error(`${cmd} writes to the production database: add --prod`);
  const by = String(opts.by || process.env.USER || 'ballot-admin');
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  const q = (sql: string, params: unknown[] = []) => pool.query(sql, params);
  const has = async (t: string) => Boolean((await q(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${t}`])).rows[0]?.ok);
  const override = async (): Promise<BallotOverride> => {
    if (!(await has('dp_ballot'))) return null;
    const row = (await q('SELECT status, published_at FROM dp_ballot WHERE slug = $1', [slug])).rows[0];
    return row ? { status: row.status, publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null } : null;
  };
  const voteRows = async () =>
    (await has('dp_ballot_vote'))
      ? (await q('SELECT question_key, option_key, user_id FROM dp_ballot_vote WHERE ballot_slug = $1', [slug])).rows
      : [];
  const setOverride = async (status: 'closed' | 'published') => {
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
        let text: string;
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
        console.log(`deleted ${r?.rowCount ?? 0} test votes`);
        break;
      }
      default:
        throw new Error(`unknown command ${cmd}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`ballot-admin: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
