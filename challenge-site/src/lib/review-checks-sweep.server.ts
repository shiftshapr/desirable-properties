/**
 * Runs the Review tab's automatic checks on the server, once per proposal version, so pages only
 * read stored results: the style check (dp_style_check, keyed by input hash) and the placement
 * check (dp_anchor_eval, keyed by proposal id and input hash).
 *
 * Started on a timer from instrumentation.ts and nudged when someone opens a Review tab. One run
 * per workgroup at a time; a failed check is retried only after RETRY_FAILED_MS, so an outage or an
 * empty model account is not hit again on every page view.
 */
import { extractDpId, fetchChallengeWorkgroups } from '@/lib/govhub';
import { runAnchorEvalForWorkgroup } from '@/lib/anchor-eval.server';
import { reviewClaudeConfigured } from '@/lib/review-claude.server';
import {
  currentStyleCheckModel,
  latestStyleCheckFailures,
  runStyleCheck,
  styleCheckInputHash,
} from '@/lib/style-check.server';
import { draftRefFromDocumentHref, draftRefFromLabel } from '@/lib/workgroup-review-govhub';
import { buildWorkgroupReviewQueue, styleCheckInputForItem } from '@/lib/workgroup-review-queue';

const RETRY_FAILED_MS = 15 * 60_000;
export const SWEEP_INTERVAL_MS = 10 * 60_000;

const running = new Map<string, Promise<void>>();

type WorkgroupRef = {
  id: string;
  name: string;
  document_href: string | null;
  document_label: string | null;
  document_draft_ref?: string | null;
};

async function sweepWorkgroup(wg: WorkgroupRef): Promise<void> {
  const dpId = extractDpId(wg.name || '');
  const draftRef =
    wg.document_draft_ref || draftRefFromDocumentHref(wg.document_href) || draftRefFromLabel(wg.document_label);
  if (!draftRef) return;

  const model = currentStyleCheckModel();
  if (model) {
    const items = await buildWorkgroupReviewQueue({
      workgroupId: wg.id,
      dpId,
      draftRef,
      documentHref: wg.document_href,
      viewerUserId: null,
    });
    const todo = items.flatMap((item) => {
      if (item.styleCheck) return [];
      const input = styleCheckInputForItem(item, dpId);
      return input ? [{ input, hash: styleCheckInputHash(input, model) }] : [];
    });
    const failures = await latestStyleCheckFailures(todo.map((t) => t.hash));
    for (const { input, hash } of todo) {
      const failed = failures.get(hash);
      if (failed && Date.now() - failed.at.getTime() < RETRY_FAILED_MS) continue;
      try {
        await runStyleCheck({ ...input, workgroupId: wg.id });
      } catch {
        // Recorded in dp_style_check; Review shows the reason and the next sweep retries.
      }
    }
  }

  if (reviewClaudeConfigured()) {
    await runAnchorEvalForWorkgroup(wg.id, { retryErrorsAfterMs: RETRY_FAILED_MS }).catch(() => undefined);
  }
}

/** Start checks for one workgroup unless a run is already going. Never throws; does not wait. */
export function nudgeReviewChecks(wg: WorkgroupRef): void {
  if (running.has(wg.id)) return;
  const run = sweepWorkgroup(wg)
    .catch((err) => console.warn('[review-checks]', wg.name, err instanceof Error ? err.message : err))
    .finally(() => running.delete(wg.id));
  running.set(wg.id, run);
}

/** Check every DP workgroup, one after another. */
export async function sweepAllReviewChecks(): Promise<void> {
  const workgroups = await fetchChallengeWorkgroups();
  for (const wg of workgroups) {
    if (running.has(wg.id)) continue;
    nudgeReviewChecks(wg);
    await running.get(wg.id);
  }
}
