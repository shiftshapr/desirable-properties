'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import AstraContentViewerModal, {
  type AstraViewerContent,
} from '@/components/astra/AstraContentViewerModal';
import AstraExcludedProposalsModal from '@/components/astra/AstraExcludedProposalsModal';
import { fetchAstraChapter, fetchAstraReleaseDoc } from '@/lib/astra-api';
import {
  excludedAstraDispositions,
  parseAstraDispositions,
  type AstraProposalDisposition,
} from '@/lib/astra-dispositions';
import type { AstraReleaseManifest } from '@/lib/astra-types';
import { astraKeyToDpId } from '@/lib/astra-utils';
import { dpWorkgroupSlug } from '@/lib/dp-workgroup-slugs';

type Props = {
  manifest: AstraReleaseManifest;
};

type ModalState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  content: AstraViewerContent | null;
};

const INITIAL_MODAL: ModalState = {
  open: false,
  loading: false,
  error: null,
  content: null,
};

type NavDoc = {
  id: 'readme' | 'change-format' | 'dispositions' | 'verification';
  label: string;
  title: string;
  downloadFilename: string;
};

const NAV_DOCS: NavDoc[] = [
  {
    id: 'readme',
    label: 'Editorial overview',
    title: 'Editorial overview',
    downloadFilename: 'README.md',
  },
  {
    id: 'change-format',
    label: 'JSON and renderer guide',
    title: 'JSON and renderer guide',
    downloadFilename: 'change-format.md',
  },
  {
    id: 'dispositions',
    label: "Every proposal's disposition",
    title: "Every proposal's disposition",
    downloadFilename: 'proposal-dispositions.json',
  },
  {
    id: 'verification',
    label: 'Verification results',
    title: 'Verification results',
    downloadFilename: 'verification.json',
  },
];

function formatChangeCount(count: number): string {
  if (count === 0) return 'Unchanged';
  return String(count);
}

export default function EditorialSynthesisIndex({ manifest }: Props) {
  const [modal, setModal] = useState<ModalState>(INITIAL_MODAL);
  const [excludedOpen, setExcludedOpen] = useState(false);
  const [excludedLoading, setExcludedLoading] = useState(false);
  const [excludedError, setExcludedError] = useState<string | null>(null);
  const [excludedItems, setExcludedItems] = useState<AstraProposalDisposition[]>([]);
  const [excludedChapterFilter, setExcludedChapterFilter] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalChanges = manifest.chapters.reduce((sum, chapter) => sum + chapter.changeCount, 0);
    const chaptersWithChanges = manifest.chapters.filter((chapter) => chapter.changeCount > 0).length;
    const totalOmitted = manifest.chapters.reduce((sum, chapter) => sum + chapter.omittedCount, 0);
    return { totalChanges, chaptersWithChanges, totalOmitted };
  }, [manifest.chapters]);

  const closeModal = useCallback(() => {
    setModal(INITIAL_MODAL);
  }, []);

  const closeExcludedModal = useCallback(() => {
    setExcludedOpen(false);
    setExcludedChapterFilter(null);
  }, []);

  const openExcludedProposals = useCallback(async (chapterId?: string | null) => {
    setExcludedOpen(true);
    setExcludedChapterFilter(chapterId?.trim().toUpperCase() || null);
    setExcludedLoading(true);
    setExcludedError(null);
    try {
      const payload = await fetchAstraReleaseDoc('dispositions');
      const all = parseAstraDispositions(payload.content);
      setExcludedItems(excludedAstraDispositions(all));
    } catch (loadError) {
      setExcludedItems([]);
      setExcludedError(
        loadError instanceof Error ? loadError.message : 'Failed to load excluded proposals',
      );
    } finally {
      setExcludedLoading(false);
    }
  }, []);

  const openReleaseDoc = useCallback(async (doc: NavDoc) => {
    setModal({ open: true, loading: true, error: null, content: null });
    try {
      const payload = await fetchAstraReleaseDoc(doc.id);
      if (payload.contentType === 'markdown') {
        setModal({
          open: true,
          loading: false,
          error: null,
          content: {
            kind: 'markdown',
            title: doc.title,
            markdown: String(payload.content || ''),
            downloadFilename: doc.downloadFilename,
          },
        });
        return;
      }
      setModal({
        open: true,
        loading: false,
        error: null,
        content: {
          kind: 'json',
          title: doc.title,
          data: payload.content,
          downloadFilename: doc.downloadFilename,
        },
      });
    } catch (loadError) {
      setModal({
        open: true,
        loading: false,
        error: loadError instanceof Error ? loadError.message : 'Failed to load document',
        content: null,
      });
    }
  }, []);

  const openChapterMarkdown = useCallback(async (dpKey: string, chapterId: string) => {
    setModal({ open: true, loading: true, error: null, content: null });
    try {
      const bundle = await fetchAstraChapter(dpKey);
      setModal({
        open: true,
        loading: false,
        error: null,
        content: {
          kind: 'markdown',
          title: `${chapterId} chapter text`,
          markdown: bundle.markdown,
          downloadFilename: `${dpKey}.md`,
        },
      });
    } catch (loadError) {
      setModal({
        open: true,
        loading: false,
        error: loadError instanceof Error ? loadError.message : 'Failed to load chapter',
        content: null,
      });
    }
  }, []);

  const openChapterJson = useCallback(async (dpKey: string, chapterId: string) => {
    setModal({ open: true, loading: true, error: null, content: null });
    try {
      const bundle = await fetchAstraChapter(dpKey);
      setModal({
        open: true,
        loading: false,
        error: null,
        content: {
          kind: 'json',
          title: `${chapterId} change record`,
          data: bundle.manifest,
          downloadFilename: `${dpKey}.json`,
        },
      });
    } catch (loadError) {
      setModal({
        open: true,
        loading: false,
        error: loadError instanceof Error ? loadError.message : 'Failed to load change record',
        content: null,
      });
    }
  }, []);

  return (
    <>
      <header className="border-b border-slate-800 pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
          Desirable Properties · Editorial synthesis
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
          Twenty-three coherent chapters.
          <br />
          Every change traceable.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300">
          23 complete chapters reconciled from the CFI and community proposals, with reproducible
          change records and on-demand explanations.
        </p>
      </header>

      <div className="mt-8 rounded-xl border border-cyan-900/50 bg-cyan-950/20 px-5 py-4 text-sm text-slate-200">
        <p className="font-medium text-white">
          {stats.totalChanges} changes across {stats.chaptersWithChanges} chapters
        </p>
        <p className="mt-1 text-slate-400">
          {stats.totalChanges} integrated changes across {stats.chaptersWithChanges} chapters
          (DP23 reviewed unchanged). Source corpus: 257 CFI proposals and 29 community proposals,
          reconciled with provenance preserved.
          {stats.totalOmitted > 0 ? (
            <>
              {' '}
              ·{' '}
              <button
                type="button"
                onClick={() => void openExcludedProposals()}
                className="text-amber-200 underline decoration-amber-700/60 underline-offset-2 hover:text-amber-100"
              >
                {stats.totalOmitted} not included in synthesis
              </button>
            </>
          ) : null}
          {manifest.verified ? (
            <span className="ml-2 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-300">
              Replay verified
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-slate-500">Release {manifest.releaseId}</p>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-slate-400">
        Open a chapter to see its highlighted changes in the workgroup Astra tab. Each change links
        back to source proposals and rationale. Use the table below to preview chapter text and change
        records, or browse the editorial overview and verification artifacts.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {stats.totalOmitted > 0 ? (
          <button
            type="button"
            onClick={() => void openExcludedProposals()}
            className="rounded-full border border-amber-800/60 bg-amber-950/30 px-4 py-2 text-sm text-amber-100 transition hover:border-amber-600 hover:bg-amber-950/50"
          >
            Proposals not included ({stats.totalOmitted})
          </button>
        ) : null}
        {NAV_DOCS.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => void openReleaseDoc(doc)}
            className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-slate-200 transition hover:border-violet-600/60 hover:bg-violet-950/30 hover:text-violet-100"
          >
            {doc.label}
          </button>
        ))}
      </nav>

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Chapter preview</th>
              <th className="px-4 py-3 font-medium">Changes</th>
              <th className="px-4 py-3 font-medium">Not included</th>
              <th className="px-4 py-3 font-medium">Chapter text</th>
              <th className="px-4 py-3 font-medium">Change record</th>
            </tr>
          </thead>
          <tbody>
            {manifest.chapters.map((chapter) => {
              const dpId = astraKeyToDpId(chapter.dpKey) || chapter.chapterId;
              const slug = dpWorkgroupSlug(dpId);
              const previewHref = slug ? `/workgroups/${slug}?tab=astra` : null;

              return (
                <tr key={chapter.dpKey} className="border-b border-slate-800/80 last:border-b-0">
                  <td className="px-4 py-3">
                    {previewHref ? (
                      <Link
                        href={previewHref}
                        className="font-medium text-cyan-300 hover:text-cyan-200"
                      >
                        {chapter.chapterId}
                      </Link>
                    ) : (
                      <span className="text-slate-300">{chapter.chapterId}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{formatChangeCount(chapter.changeCount)}</td>
                  <td className="px-4 py-3">
                    {chapter.omittedCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => void openExcludedProposals(chapter.chapterId)}
                        className="text-amber-300 hover:text-amber-200"
                      >
                        {chapter.omittedCount} proposal{chapter.omittedCount === 1 ? '' : 's'}
                      </button>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {chapter.status === 'available' ? (
                      <button
                        type="button"
                        onClick={() => void openChapterMarkdown(chapter.dpKey, chapter.chapterId)}
                        className="text-violet-300 hover:text-violet-200"
                      >
                        Markdown
                      </button>
                    ) : (
                      <span className="text-slate-500">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {chapter.status === 'available' ? (
                      <button
                        type="button"
                        onClick={() => void openChapterJson(chapter.dpKey, chapter.chapterId)}
                        className="text-violet-300 hover:text-violet-200"
                      >
                        JSON
                      </button>
                    ) : (
                      <span className="text-slate-500">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Based on release {manifest.releaseId}
        {manifest.publishedAt
          ? ` published ${new Date(manifest.publishedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}`
          : ''}
        . This editorial synthesis view does not change the published book.
      </p>

      <AstraContentViewerModal
        open={modal.open}
        content={modal.content}
        loading={modal.loading}
        error={modal.error}
        onClose={closeModal}
      />

      <AstraExcludedProposalsModal
        open={excludedOpen}
        loading={excludedLoading}
        error={excludedError}
        items={excludedItems}
        filterChapter={excludedChapterFilter}
        onClose={closeExcludedModal}
      />
    </>
  );
}
