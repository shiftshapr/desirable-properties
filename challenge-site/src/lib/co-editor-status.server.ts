import { fetchReadinessBoard } from '@/lib/v1-readiness.server';
import { openProposalCountsByDp } from '@/lib/open-proposals.server';
import { coEditorCountFromDetail } from '@/lib/workgroup-roster-nudge';

export const SEATS_PER_DP = 2;

export type CoEditorStatus = {
  seatsFilled: number;
  seatsTotal: number;
  /** DPs with at least one open co-editor seat, in DP order. */
  needsCoEditor: Array<{ dp: string; seats: number }>;
  openProposals: number | null;
  openByDp: Map<string, number>;
};

/** Live co-editor seats (Gov Hub readiness) and open proposals (Gov Hub pending + unfiled book posts). */
export async function coEditorStatus(): Promise<CoEditorStatus | null> {
  const board = await fetchReadinessBoard();
  if (!board.dps.length) return null;
  const rows = board.dps.map((dp) => ({
    dp: dp.dp,
    seats: Math.min(SEATS_PER_DP, coEditorCountFromDetail(dp.checks.co_editors?.detail) ?? 0),
  }));
  const open = await openProposalCountsByDp(board.dps).catch(() => new Map<string, number>());
  return {
    seatsFilled: rows.reduce((sum, r) => sum + r.seats, 0),
    seatsTotal: rows.length * SEATS_PER_DP,
    needsCoEditor: rows
      .filter((r) => r.seats < SEATS_PER_DP)
      .sort((a, b) => Number(a.dp.slice(2)) - Number(b.dp.slice(2))),
    openProposals: open.size ? [...open.values()].reduce((a, b) => a + b, 0) : null,
    openByDp: open,
  };
}
