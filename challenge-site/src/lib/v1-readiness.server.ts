import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { READINESS_ITEMS, type ReadinessItem } from '@/data/dp-process';

export type ReadinessCheck = {
  pass: boolean | null;
  detail: string;
  note?: string | null;
  checked_by?: string | null;
  checked_at?: string | null;
};

export type DpReadiness = {
  dp: string;
  number: number;
  workgroup_id: string;
  acronym: string;
  slug: string | null;
  name: string;
  draft_ref: string | null;
  draft_title: string | null;
  pending_proposals: number;
  accepted_proposals: number;
  members: number;
  passed: number;
  checks: Record<string, ReadinessCheck>;
};

export type ReadinessBoard = {
  generatedAt: string;
  filingReportAt: string | null;
  items: ReadinessItem[];
  dps: DpReadiness[];
  error: string | null;
};

type GovHubReadiness = {
  generated_at: string;
  dps: DpReadiness[];
};

type FilingPost = { page_dp?: string; home_dp?: string; status?: string; kind?: string };
type FilingReport = { generated_at?: string; posts?: FilingPost[] };

const FILING_REPORT = path.resolve(process.cwd(), '..', 'data/loop/canopi-filing-prod.json');

async function readFilingReport(): Promise<FilingReport | null> {
  try {
    return JSON.parse(await fs.readFile(FILING_REPORT, 'utf8')) as FilingReport;
  } catch {
    return null;
  }
}

/** Canopi posts on a chapter that still need a human: blocked, errored, or not yet filed. */
function canopiFiledCheck(dp: string, report: FilingReport | null): ReadinessCheck {
  if (!report?.posts) return { pass: null, detail: 'filing report unavailable' };
  const posts = report.posts.filter((p) => (p.home_dp || p.page_dp) === dp);
  const open = posts.filter((p) => ['blocked', 'would_file', 'error'].includes(String(p.status)));
  if (!posts.length) return { pass: true, detail: 'no Canopi patches or inserts on this chapter' };
  return {
    pass: open.length === 0,
    detail: open.length
      ? `${open.length} of ${posts.length} not yet filed`
      : `${posts.length} post${posts.length === 1 ? '' : 's'} filed or decided`,
  };
}

export async function fetchReadinessBoard(): Promise<ReadinessBoard> {
  const [govhub, report] = await Promise.all([
    (async () => {
      try {
        const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}/api/dp/readiness/`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return null;
        return (await res.json()) as GovHubReadiness;
      } catch {
        return null;
      }
    })(),
    readFilingReport(),
  ]);

  if (!govhub) {
    return {
      generatedAt: new Date().toISOString(),
      filingReportAt: report?.generated_at ?? null,
      items: [...READINESS_ITEMS],
      dps: [],
      error: 'Gov Hub readiness data is unavailable right now.',
    };
  }

  const dps = govhub.dps.map((dp) => {
    const checks = { ...dp.checks, canopi_filed: canopiFiledCheck(dp.dp, report) };
    const passed = Object.values(checks).filter((c) => c.pass === true).length;
    return { ...dp, checks, passed };
  });

  return {
    generatedAt: govhub.generated_at,
    filingReportAt: report?.generated_at ?? null,
    items: [...READINESS_ITEMS],
    dps,
    error: null,
  };
}

export async function fetchDpReadiness(dpId: string): Promise<DpReadiness | null> {
  const board = await fetchReadinessBoard();
  const wanted = dpId.toUpperCase();
  return board.dps.find((d) => d.dp.toUpperCase() === wanted) ?? null;
}
