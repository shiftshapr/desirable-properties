import ListeningWorkspace from '@/components/listening/ListeningWorkspace';
import { listeningWorkspaceEnabled } from '@/lib/listening/flag';
import { getMeetingBySlug } from '@/lib/listening/store.server';

/**
 * Server mount point for an occurrence's page. Renders nothing unless the listening-workspace flag is on
 * (staging only) and the meeting record exists, so production pages are unchanged and run no listening SQL.
 */
export default async function ListeningWorkspaceMount({
  slug,
  pagePhaseTracker = false,
}: {
  slug: string;
  /** The page has its own phase tracker: the workspace then shows its record phase as secondary. */
  pagePhaseTracker?: boolean;
}) {
  if (!listeningWorkspaceEnabled()) return null;
  try {
    const meeting = await getMeetingBySlug(slug);
    if (!meeting) return null;
  } catch (err) {
    console.error('[listening] mount skipped:', err instanceof Error ? err.message : err);
    return null;
  }
  // Wider than the notes column: three panels side by side on desktop.
  return (
    <div id="workspace" className="mx-auto w-full min-w-0 max-w-[96rem] scroll-mt-24 px-4 pb-14 sm:px-6">
      <ListeningWorkspace slug={slug} pagePhaseTracker={pagePhaseTracker} />
    </div>
  );
}
