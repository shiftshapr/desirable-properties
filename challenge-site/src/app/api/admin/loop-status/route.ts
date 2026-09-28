import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { NextResponse } from 'next/server';
import { requireDpAdmin } from '@/lib/dp-admin-api';

export const dynamic = 'force-dynamic';

const run = promisify(execFile);
const REPO_ROOT = process.env.DP_REPO_ROOT || '/home/ubuntu/desirable-properties';
const STATUS_PATH = process.env.DP_LOOP_STATUS_PATH || path.join(REPO_ROOT, 'data/loop/dp-loop-status.json');
const COLLECTOR = path.join(REPO_ROOT, 'scripts/dp_loop_status.py');
const NO_STORE = { 'Cache-Control': 'no-store' };

let refreshing: Promise<void> | null = null;

async function readStatus() {
  const [raw, info] = await Promise.all([readFile(STATUS_PATH, 'utf8'), stat(STATUS_PATH)]);
  return { status: JSON.parse(raw), fileMtime: info.mtime.toISOString() };
}

export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { status, fileMtime } = await readStatus();
    return NextResponse.json({ ok: true, status, fileMtime, refreshing: Boolean(refreshing) }, { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: `No loop snapshot at ${STATUS_PATH}. Run scripts/dp_loop_status.py.`, detail: String(err) },
      { status: 404, headers: NO_STORE },
    );
  }
}

/** Re-run the read-only collector, then return the fresh snapshot. */
export async function POST() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;
  if (!refreshing) {
    refreshing = run('python3', [COLLECTOR, '--out', STATUS_PATH], { timeout: 180_000, cwd: REPO_ROOT })
      .then(() => undefined)
      .finally(() => {
        refreshing = null;
      });
  }
  try {
    await refreshing;
    const { status, fileMtime } = await readStatus();
    return NextResponse.json({ ok: true, status, fileMtime }, { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json({ ok: false, message: 'Collector failed', detail: String(err).slice(0, 800) }, { status: 500, headers: NO_STORE });
  }
}
