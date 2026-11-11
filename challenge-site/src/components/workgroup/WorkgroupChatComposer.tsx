'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import WorkgroupChatAiAssist from '@/components/workgroup/WorkgroupChatAiAssist';
import { clearChatDraft, loadChatDraft, saveChatDraft } from '@/lib/workgroup-draft-storage';
import type { WorkgroupAskNote } from '@/lib/workgroup-hermes-panel-types';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';
import { formatAttachmentSize } from '@/lib/workgroup-relay-message';

/** Same limits Gov Hub enforces on member uploads. */
const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
const ACCEPT = '.pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg';
const ALLOWED_EXT = /\.(pdf|docx|png|jpe?g)$/i;

/** Error for files that would be refused, or null. */
function checkFiles(files: File[]): string | null {
  if (files.length > MAX_FILES) return `At most ${MAX_FILES} files per message.`;
  const bad = files.find((f) => !ALLOWED_EXT.test(f.name));
  if (bad) return `${bad.name}: only PDF, Word (.docx), PNG or JPEG files.`;
  const big = files.find((f) => f.size > MAX_FILE_BYTES);
  if (big) return `${big.name} is over 10 MB.`;
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) return 'Files total more than 15 MB.';
  return null;
}

type Props = {
  workgroupSlug: string;
  workgroupName: string;
  dpId: string | null;
  recentMessages: WorkgroupMessage[];
  recentAskNotes?: WorkgroupAskNote[];
  canPost: boolean;
  signedIn: boolean;
  busy?: boolean;
  onSend: (body: string, files?: File[]) => Promise<void>;
  adoptDraft?: { key: number; text: string } | null;
  onHermesReply?: (note: WorkgroupAskNote) => void;
  onOpenHermesInstructions?: () => void;
};

export default function WorkgroupChatComposer({
  workgroupSlug,
  workgroupName,
  dpId,
  recentMessages,
  recentAskNotes,
  canPost,
  signedIn,
  busy,
  onSend,
  adoptDraft,
  onHermesReply,
  onOpenHermesInstructions,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBody(loadChatDraft(workgroupSlug));
    setHydrated(true);
  }, [workgroupSlug]);

  useEffect(() => {
    if (!hydrated) return;
    saveChatDraft(workgroupSlug, body);
  }, [body, hydrated, workgroupSlug]);

  useEffect(() => {
    if (!adoptDraft?.text) return;
    setBody(adoptDraft.text);
  }, [adoptDraft?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  function addFiles(picked: FileList | null) {
    if (!picked?.length) return;
    const next = [...files, ...Array.from(picked)];
    const problem = checkFiles(next);
    if (problem) {
      setError(problem);
    } else {
      setError(null);
      setFiles(next);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if ((!text && !files.length) || busy) return;
    setError(null);
    try {
      await onSend(text, files);
      setBody('');
      setFiles([]);
      clearChatDraft(workgroupSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    }
  }

  if (!signedIn) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
        <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
          Sign in
        </Link>{' '}
        to post in this workgroup.
      </div>
    );
  }

  if (!canPost) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
        Only workgroup members can post. Join the group to contribute.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <label htmlFor="wg-chat-body" className="sr-only">
          Message
        </label>
        <textarea
          ref={textareaRef}
          id="wg-chat-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={8000}
          placeholder="Share an update with the workgroup…"
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pb-10 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
          disabled={busy}
        />
        <WorkgroupChatAiAssist
          textareaRef={textareaRef}
          value={body}
          onValueChange={setBody}
          workgroupSlug={workgroupSlug}
          workgroupName={workgroupName}
          dpId={dpId}
          recentMessages={recentMessages}
          recentAskNotes={recentAskNotes}
          disabled={busy}
          onSendAsMessage={async (text) => {
            if (!text.trim() || busy) return;
            setError(null);
            try {
              await onSend(text.trim());
              setBody('');
              clearChatDraft(workgroupSlug);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to send');
            }
          }}
          onHermesReply={onHermesReply}
          onOpenHermesInstructions={onOpenHermesInstructions}
        />
      </div>
      {files.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Files to attach">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
            >
              <span className="max-w-[16rem] truncate" title={file.name}>
                {file.name}
              </span>
              <span className="text-slate-500">{formatAttachmentSize(file.size)}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                disabled={busy}
                className="text-slate-400 hover:text-rose-300"
                aria-label={`Remove ${file.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || files.length >= MAX_FILES}
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-700 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            title="PDF, Word (.docx), PNG or JPEG; up to 3 files, 10 MB each"
          >
            Attach file
          </button>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
        <button
          type="submit"
          disabled={busy || (!body.trim() && !files.length)}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Post message'}
        </button>
      </div>
    </form>
  );
}
