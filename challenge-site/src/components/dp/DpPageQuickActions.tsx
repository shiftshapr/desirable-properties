import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import { bookDiscussHref, GOVHUB_DP_PATCHES_URL } from '@/lib/govhub';

type Props = {
  dpId: string;
  readHref: string | null;
  pdfDownloadHref: string | null;
  pdfDownloadName: string | null;
  workgroupHref: string | null;
  collabEnabled: boolean;
};

/** Top-of-page draft + collab shortcuts on DP detail pages. */
export default function DpPageQuickActions({
  dpId,
  readHref,
  pdfDownloadHref,
  pdfDownloadName,
  workgroupHref,
  collabEnabled,
}: Props) {
  const patchHref = readHref || GOVHUB_DP_PATCHES_URL;
  const showRow = Boolean(readHref || pdfDownloadHref || (collabEnabled && workgroupHref));
  if (!showRow) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <DiscussPatchLink
        href={bookDiscussHref({ dpId })}
        className="inline-flex items-center justify-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
      >
        Read & discuss on the book
      </DiscussPatchLink>
      <a
        href={patchHref}
        className="inline-flex items-center justify-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
      >
        Patch on Gov Hub
      </a>
      {pdfDownloadHref ? (
        <a
          href={pdfDownloadHref}
          download={pdfDownloadName || undefined}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Download PDF
        </a>
      ) : null}
      {collabEnabled && workgroupHref ? (
        <Link
          href={workgroupHref}
          className="inline-flex items-center justify-center rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 sm:ml-auto"
        >
          Collaborate
        </Link>
      ) : null}
    </div>
  );
}
