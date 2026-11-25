/**
 * One-off migration of every pad vote from the DP site's Postgres to Gov Hub, the store of record
 * (handoff/specs/pad-votes-govhub-api.md §7, owner approved 25 Nov 2026).
 *
 *   node --experimental-strip-types --env-file=.env.local scripts/pad-votes-migrate.mjs [--db env] [--apply] [--prod]
 *
 * It moves:
 *  - session ballots (dp_ballot_vote) with their definitions, status and published results;
 *  - proposal pads' advisory support/concern (dp_pad_advisory);
 *  - next-session proposal supports (dp_session_proposal_support);
 *  - screening objections (dp_screening_objection), with their withdrawals;
 *  - the voter-list setting (dp_voter_setting) and the checked real names (src/lib/ballots/voter-names.server.ts).
 *
 * The default is a DRY RUN: Gov Hub imports and recounts, then rolls back. --apply commits. Production
 * (desirable_properties) also needs --prod. For each ballot, the published results must equal Gov Hub's recount, and on
 * production the 16 Nov results must also equal the published snapshot (src/data/sessions/2026-11-16-results.json).
 * The voter list must come out the same before and after. Any mismatch stops the import and nothing is written.
 *
 * Run it only while no ballot is open. Then set PAD_VOTES_BACKEND=govhub. The DP tables are left untouched (they are
 * renamed and dropped later, after the owner confirms).
 * Prints counts only. It never prints an account next to a choice, and never prints a secret.
 *
 * Options: --db <url> | env (default: the box2 staging DB over the local socket; `env` = DP_DATABASE_URL);
 * --govhub <base url> (default GOVHUB_INTERNAL_BASE_URL); --admin-email (default PAD_VOTES_GOVHUB_ADMIN_EMAIL or the
 * first DP_ADMIN_EMAILS). The internal secret is read from the environment, as the site does.
 */
import { readFileSync } from 'fs';
import pg from 'pg';
import { SESSION_BALLOTS } from '../src/data/sessions/2026-11-16-ballot.ts';
import { tallyBallot } from '../src/lib/ballots/ballot-core.ts';
import { participation, publicParticipation } from '../src/lib/ballots/participation-core.ts';

const PRODUCTION_DB_NAME = 'desirable_properties';
const DEFAULT_DB = 'postgresql:///desirable_properties_staging?host=/var/run/postgresql';

function args() {
  const opts = {};
  const rest = process.argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      opts[a.slice(2)] = next;
      i++;
    } else opts[a.slice(2)] = true;
  }
  return opts;
}

function dbName(url) {
  try {
    return decodeURIComponent(new URL(url.replace(/^postgres(ql)?:\/\/\//, 'postgresql://localhost/')).pathname.slice(1));
  } catch {
    return '';
  }
}

const iso = (v) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

function secret() {
  // Gov Hub checks GOVHUB_HERMES_API_KEY first (services/support_auth.hermes_api_secret); on production it is the
  // only one that matches.
  return (
    process.env.GOVHUB_HERMES_API_KEY ||
    process.env.METAWEB_GOVHUB_INTERNAL_SECRET ||
    process.env.DP_AUTH_HANDOFF_SECRET ||
    process.env.METAWEB_OPS_SECRET ||
    process.env.DP_HERMES_API_KEY ||
    process.env.DP_SUPPORT_OPS_SECRET ||
    ''
  ).trim();
}

/** The checked real names, read from the server-only module's source (no runtime import). */
function voterNames() {
  const src = readFileSync(new URL('../src/lib/ballots/voter-names.server.ts', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('VOTER_NAMES'), src.indexOf('VOTER_MERGE'));
  const out = {};
  for (const m of block.matchAll(/'([0-9a-f-]{36})':\s*(null|'([^']*)')/g)) out[m[1]] = m[3] ?? null;
  return out;
}

async function tableExists(q, t) {
  return Boolean((await q(`SELECT to_regclass($1) IS NOT NULL AS ok`, [`public.${t}`])).rows[0]?.ok);
}

function sameResults(a, b) {
  const norm = (r) =>
    JSON.stringify({
      voters: r.voters,
      q: r.questions.map((x) => [x.key, x.ballots, x.abstain, x.options.map((o) => [o.key, o.votes]), x.outcome]),
    });
  return norm(a) === norm(b);
}

async function main() {
  const opts = args();
  const url = opts.db === 'env' ? process.env.DP_DATABASE_URL || '' : String(opts.db || DEFAULT_DB);
  if (!url) throw new Error('--db env needs DP_DATABASE_URL');
  const prod = dbName(url) === PRODUCTION_DB_NAME;
  if (prod && opts.apply && !opts.prod) throw new Error('production database: add --prod to apply');
  const base = String(opts.govhub || process.env.GOVHUB_INTERNAL_BASE_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('--govhub <base url> or GOVHUB_INTERNAL_BASE_URL is required');
  const email = String(opts['admin-email'] || process.env.PAD_VOTES_GOVHUB_ADMIN_EMAIL || (process.env.DP_ADMIN_EMAILS || process.env.ONCHAIN_ADMIN_EMAILS || '').split(',')[0] || '')
    .trim()
    .toLowerCase();
  if (!secret() || !email) throw new Error('the Gov Hub internal secret and an admin email must be set in the environment');

  const pool = new pg.Pool({ connectionString: url, max: 2 });
  const q = (sql, params) => pool.query(sql, params);
  try {
    const now = new Date();
    for (const def of Object.values(SESSION_BALLOTS)) {
      if (now >= new Date(def.opensAt) && now < new Date(def.closesAt)) {
        const o = (await tableExists(q, 'dp_ballot')) ? (await q('SELECT status FROM dp_ballot WHERE slug = $1', [def.slug])).rows[0] : null;
        if (!o) throw new Error(`${def.slug} is open: migrate only while no ballot is open`);
      }
    }

    // ---- ballots
    const ballots = [];
    const before = {};
    const partRows = [];
    for (const def of Object.values(SESSION_BALLOTS)) {
      const rows = (await tableExists(q, 'dp_ballot_vote'))
        ? (await q('SELECT question_key, option_key, user_id, cast_at, updated_at FROM dp_ballot_vote WHERE ballot_slug = $1', [def.slug])).rows
        : [];
      const o = (await tableExists(q, 'dp_ballot'))
        ? (await q('SELECT status, closed_at, published_at FROM dp_ballot WHERE slug = $1', [def.slug])).rows[0]
        : null;
      const tally = tallyBallot(def, rows.map((r) => ({ question_key: r.question_key, option_key: r.option_key, user_id: String(r.user_id) })));
      if (prod && def.slug === 'meta-governance-2026-11-16' && o?.status === 'published') {
        const snap = JSON.parse(readFileSync(new URL('../src/data/sessions/2026-11-16-results.json', import.meta.url), 'utf8')).results;
        if (!sameResults(tally, snap)) throw new Error(`${def.slug}: the DP rows no longer match the published snapshot`);
      }
      before[def.slug] = { voters: tally.voters, rows: rows.length, status: o?.status || 'window' };
      for (const s of new Set(rows.map((r) => String(r.user_id)))) partRows.push({ ballot_slug: def.slug, user_id: s });
      if (!rows.length && !o) continue;
      ballots.push({
        definition: { ...def, eligibility: { rule: 'signed_in' } },
        status: o?.status || null,
        closed_at: iso(o?.closed_at),
        published_at: iso(o?.published_at),
        results: o?.status === 'published' ? tally : null,
        votes: rows.map((r) => ({
          user_id: String(r.user_id),
          question_key: r.question_key,
          option_key: r.option_key,
          cast_at: iso(r.cast_at),
          updated_at: iso(r.updated_at),
        })),
      });
    }

    // ---- signals
    const signals = [];
    if (await tableExists(q, 'dp_pad_advisory')) {
      for (const r of (await q('SELECT pad_id, user_id, stance, reason, show_name, cast_at, updated_at FROM dp_pad_advisory')).rows) {
        signals.push({ pad_kind: 'proposal_pad', pad_ref: r.pad_id, user_id: String(r.user_id), kind: r.stance, reason: r.reason,
          show_name: r.show_name, created_at: iso(r.cast_at), updated_at: iso(r.updated_at) });
      }
    }
    if (await tableExists(q, 'dp_session_proposal_support')) {
      for (const r of (await q('SELECT proposal_id, user_id, created_at FROM dp_session_proposal_support')).rows) {
        signals.push({ pad_kind: 'session_proposal', pad_ref: String(r.proposal_id), user_id: String(r.user_id), kind: 'support',
          show_name: true, created_at: iso(r.created_at) });
      }
    }
    if (await tableExists(q, 'dp_screening_objection')) {
      for (const r of (await q('SELECT ballot_slug, question_key, member_user_id, reason, created_at, withdrawn_at FROM dp_screening_objection')).rows) {
        signals.push({ pad_kind: 'screening', pad_ref: r.ballot_slug, question_key: r.question_key, user_id: String(r.member_user_id),
          kind: 'objection', reason: r.reason, show_name: true, created_at: iso(r.created_at), withdrawn_at: iso(r.withdrawn_at) });
      }
    }

    // ---- voter list settings and names
    const names = voterNames();
    const hidden = new Set();
    const settings = new Map(Object.entries(names).filter(([, n]) => n).map(([id, n]) => [id, { user_id: id, real_name: n }]));
    if (await tableExists(q, 'dp_voter_setting')) {
      for (const r of (await q('SELECT user_id, show_name FROM dp_voter_setting')).rows) {
        const id = String(r.user_id);
        if (!r.show_name) hidden.add(id);
        settings.set(id, { ...(settings.get(id) || { user_id: id }), show_name: Boolean(r.show_name) });
      }
    }
    const ballotList = Object.values(SESSION_BALLOTS).map((b) => ({ slug: b.slug, closesAt: b.closesAt }));
    const dpList = publicParticipation(participation(ballotList, partRows, now), (id) => names[id] ?? null, hidden);

    console.log(`DP site (${prod ? 'PRODUCTION' : dbName(url)}):`);
    for (const [slug, b] of Object.entries(before)) console.log(`  ${slug}: ${b.voters} voters, ${b.rows} answers, ${b.status}`);
    const kinds = signals.reduce((m, s) => ({ ...m, [s.pad_kind]: (m[s.pad_kind] || 0) + 1 }), {});
    console.log(`  signals: ${JSON.stringify(kinds)}; settings: ${settings.size}; voter list: ${dpList.voters} voters, ${dpList.listed.length} listed`);

    // Settings only for accounts Gov Hub can know about here; unknown ones are reported, not fatal.
    const body = { ballots, signals, settings: [...settings.values()], dry_run: !opts.apply };
    const res = await fetch(`${base}/api/pad-votes/admin/dp/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${secret()}`, 'X-DP-Admin-Email': email },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`Gov Hub refused the import (${res.status} ${out.code || ''}): ${out.error || ''}`);
      if (Array.isArray(out.user_ids)) console.error(`  ${out.user_ids.length} accounts unknown on this Gov Hub`);
      process.exitCode = 1;
      return;
    }
    console.log(`Gov Hub (${opts.apply ? 'APPLIED' : 'dry run, rolled back'}):`);
    for (const b of out.ballots || []) {
      if (b.skipped) {
        console.log(`  ${b.slug}: skipped (${b.skipped})`);
        continue;
      }
      const same = before[b.slug] && b.recount.voters === before[b.slug].voters;
      console.log(`  ${b.slug}: ${b.voters} voters, status ${b.status}, recount ${same ? 'matches' : 'DIFFERS'}`);
      if (!same) process.exitCode = 1;
    }
    console.log(`  signals: ${JSON.stringify(out.signals)}; settings: ${JSON.stringify(out.settings)}`);
    const gh = out.participation || { voters: 0, listed: [] };
    const key = (l) => JSON.stringify(l.map((v) => [v.name, v.ballots, v.currentStreak ?? v.current_streak, v.longestStreak ?? v.longest_streak]));
    const listSame = gh.voters === dpList.voters && key(gh.listed) === key(dpList.listed);
    console.log(`  voter list: ${gh.voters} voters, ${gh.listed.length} listed: ${listSame ? 'identical' : 'DIFFERS'}`);
    if (!listSame) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
