'use client';

import { useEffect, useRef, useState } from 'react';
import WorkgroupChatAiAssist from '@/components/workgroup/WorkgroupChatAiAssist';
import { DP_COMMUNITY_AI_ERRORS } from '@/lib/dp-community-ai';
import type { WorkgroupAskNote } from '@/lib/workgroup-hermes-panel-types';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

type Props = {
  communityThreadId: string;
  communityTitle: string;
  dpFocus?: number | null;
  recentMessages: WorkgroupMessage[];
  recentAskNotes?: WorkgroupAskNote[];
  canPost: boolean;
  signedIn: boolean;
  busy?: boolean;
  onSend: (body: string) => Promise<void>;
  adoptDraft?: { key: number; text: string } | null;
  onHermesReply?: (note: WorkgroupAskNote) => void;
  onOpenHermesInstructions?: () => void;
};

export default function CommunityChatComposer({
  communityThreadId,
  communityTitle,
  dpFocus = null,
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
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!adoptDraft?.text) return;
    setBody(adoptDraft.text);
  }, [adoptDraft?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    try {
      await onSend(text);
      setBody('');
    } catch {
      // Parent surfaces errors
    }
  }

  if (!signedIn) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
        Sign in to post in this Community Chat.
      </div>
    );
  }

  if (!canPost) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
        Member invite required to post. You can still read messages and use private Deepi in the sidebar when invited.
      </div>
    );
  }

  const dpId = dpFocus ? `DP${dpFocus}` : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <label htmlFor="community-chat-body" className="sr-only">
          Message Community Chat
        </label>
        <textarea
          ref={textareaRef}
          id="community-chat-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={8000}
          placeholder={DP_COMMUNITY_AI_ERRORS.communityChatPlaceholder}
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pb-10 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
          disabled={busy}
        />
        <WorkgroupChatAiAssist
          textareaRef={textareaRef}
          value={body}
          onValueChange={setBody}
          workgroupSlug="community"
          workgroupName={communityTitle}
          dpId={dpId}
          recentMessages={recentMessages}
          recentAskNotes={recentAskNotes}
          disabled={busy}
          onHermesReply={onHermesReply}
          onOpenHermesInstructions={onOpenHermesInstructions}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Posting…' : 'Post message'}
        </button>
      </div>
    </form>
  );
}
