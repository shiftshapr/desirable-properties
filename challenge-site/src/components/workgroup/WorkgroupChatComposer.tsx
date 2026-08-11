'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import WorkgroupChatAiAssist from '@/components/workgroup/WorkgroupChatAiAssist';
import { clearChatDraft, loadChatDraft, saveChatDraft } from '@/lib/workgroup-draft-storage';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  workgroupSlug: string;
  workgroupName: string;
  dpId: string | null;
  recentMessages: WorkgroupMessage[];
  canPost: boolean;
  signedIn: boolean;
  busy?: boolean;
  onSend: (body: string) => Promise<void>;
};

export default function WorkgroupChatComposer({
  workgroupSlug,
  workgroupName,
  dpId,
  recentMessages,
  canPost,
  signedIn,
  busy,
  onSend,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setError(null);
    try {
      await onSend(text);
      setBody('');
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
          disabled={busy}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-sm text-rose-300">{error}</p> : <span />}
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Post message'}
        </button>
      </div>
    </form>
  );
}
