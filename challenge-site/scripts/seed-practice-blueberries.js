#!/usr/bin/env node
/**
 * Seed the weekly practice tasks from src/data/dp-process.ts as Blueberries
 * (optional participation actions shown on /participate and /activity).
 *
 * Idempotent: a task is matched by label; existing rows are updated in place.
 *
 *   node scripts/seed-practice-blueberries.js --dry-run
 *   node scripts/seed-practice-blueberries.js --apply
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const crypto = require('crypto');
const ts = require('typescript');
const { Pool } = require('pg');

const ROOT = path.resolve(__dirname, '..');

function loadTsModule(file) {
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(outputText, file);
  return m.exports;
}

function readEnv() {
  const out = {};
  for (const name of ['.env.local', '.env']) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      if (!line.includes('=') || line.trim().startsWith('#')) continue;
      const i = line.indexOf('=');
      out[line.slice(0, i).trim()] = out[line.slice(0, i).trim()] ?? line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

/** Monday 00:00 PT → ISO; the task window runs from its first Monday to the last Monday + 7 days. */
function ptStart(iso) {
  const offset = iso < '2026-11-01' ? '-07:00' : '-08:00';
  return new Date(`${iso}T00:00:00${offset}`).toISOString();
}
function ptEnd(iso) {
  const d = new Date(`${iso}T00:00:00${iso < '2026-11-01' ? '-07:00' : '-08:00'}`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString();
}

async function main() {
  const apply = process.argv.includes('--apply');
  const { PRACTICE_TASKS } = loadTsModule(path.join(ROOT, 'src/data/dp-process.ts'));
  const env = readEnv();
  const url = env.DP_DATABASE_URL || env.DATABASE_URL;
  if (!url) throw new Error('DP_DATABASE_URL missing');
  const pool = new Pool({ connectionString: url });
  try {
    const existing = (await pool.query('SELECT id, label FROM dp_blueberry')).rows;
    const byLabel = new Map(existing.map((r) => [r.label, r.id]));
    let created = 0;
    let updated = 0;
    for (const [i, t] of PRACTICE_TASKS.entries()) {
      const weeks = [...t.weeks].sort();
      const row = {
        label: t.task,
        description: `${t.who} · about ${t.minutes} min · Done when: ${t.doneWhen}. Claim it on your workgroup page; the full list is at desirableproperties.org/process#practices.`,
        kind: 'challenge',
        dpIds: '[]',
        sortOrder: 100 + i,
        availableFrom: ptStart(weeks[0]),
        availableUntil: ptEnd(weeks[weeks.length - 1]),
      };
      const id = byLabel.get(row.label);
      console.log(`${id ? 'update' : 'create'}  ${weeks.join(',')}  ${row.label.slice(0, 70)}`);
      if (!apply) continue;
      if (id) {
        await pool.query(
          `UPDATE dp_blueberry SET description=$2, kind=$3, sort_order=$4, available_from=$5, available_until=$6, active=true, updated_at=now() WHERE id=$1`,
          [id, row.description, row.kind, row.sortOrder, row.availableFrom, row.availableUntil],
        );
        updated += 1;
      } else {
        await pool.query(
          `INSERT INTO dp_blueberry (id, label, description, kind, govhub_message_id, govhub_url, dp_ids, sort_order, requires_acceptance, active, available_from, available_until, created_at, updated_at)
           VALUES ($1,$2,$3,$4,NULL,NULL,$5::jsonb,$6,false,true,$7,$8,now(),now())`,
          [crypto.randomUUID(), row.label, row.description, row.kind, row.dpIds, row.sortOrder, row.availableFrom, row.availableUntil],
        );
        created += 1;
      }
    }
    if (apply) {
      await pool.query(
        `UPDATE dp_blueberry_settings SET intro_text = CASE WHEN intro_text = '' THEN $1 ELSE intro_text END, updated_at = now() WHERE id = 1`,
        ['This week’s practice tasks for the Version 1.0 push. Any member can take one in 30 to 60 minutes.'],
      );
    }
    console.log(apply ? `applied: ${created} created, ${updated} updated` : 'dry run; nothing written');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
