'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import HermesMarkdown from '@/components/HermesMarkdown';
import { canopiEmbedAuthHeaders } from '@/lib/embed-canopi-auth';

type EmbedAuth = {
  embedToken: string;
  userId: string;
  displayName?: string | null;
};

type HermesTurn = {
  id: string;
  text?: string;
  content?: string;
  sender?: string;
  role?: string;
  timestamp?: string;
};

type HermesMember = {
  verifierId?: string;
  displayName?: string | null;
  role?: string;
};

type HermesCommunityEmbedProps = {
  threadId: string;
  surface?: string;
};

const AUTH_REQUEST = 'CANOPI_HERMES_EMBED_AUTH_REQUEST';
const AUTH_RESPONSE = 'CANOPI_HERMES_EMBED_AUTH';

function turnText(turn: HermesTurn): string {
  return String(turn.text || turn.content || '').trim();
}

function turnSender(turn: HermesTurn): 'user' | 'assistant' {
  const s = String(turn.sender || turn.role || '').toLowerCase();
  return s === 'user' ? 'user' : 'assistant';
}

export default function HermesCommunityEmbed({
  threadId,
  surface = 'desirableproperties.org/embed/community',
}: HermesCommunityEmbedProps) {
  const [auth, setAuth] = useState<EmbedAuth | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [turns, setTurns] = useState<HermesTurn[]>([]);
  const [members, setMembers] = useState<HermesMember[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type !== AUTH_RESPONSE) return;
      const payload = data.payload || data;
      const embedToken = String(payload.embedToken || '').trim();
      const userId = String(payload.userId || '').trim();
      if (!embedToken || !userId) {
        setAuthError('Sign in on this page to use Community Chat.');
        return;
      }
      setAuth({
        embedToken,
        userId,
        displayName: payload.displayName ? String(payload.displayName) : null,
      });
      setAuthError(null);
    }
    window.addEventListener('message', onMessage);
    window.parent?.postMessage({ type: AUTH_REQUEST, threadId }, '*');
    const timer = window.setTimeout(() => {
      setAuthError((prev) => prev || 'Waiting for Canopi sign-in…');
    }, 8000);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
    };
  }, [threadId]);

  const authHeaders = useCallback(() => {
    if (!auth) return null;
    return canopiEmbedAuthHeaders(auth);
  }, [auth]);

  const loadThread = useCallback(async () => {
    const headers = authHeaders();
    if (!headers) return;
    setLoading(true);
    setError(null);
    try {
      const [threadRes, accessRes] = await Promise.all([
        fetch(`/api/embed/hermes/community/thread?threadId=${encodeURIComponent(threadId)}`, { headers }),
        fetch(`/api/embed/hermes/community/access?threadId=${encodeURIComponent(threadId)}`, { headers }),
      ]);
      const threadData = await threadRes.json().catch(() => ({}));
      const accessData = await accessRes.json().catch(() => ({}));
      if (!threadRes.ok) {
        throw new Error(threadData.error || 'Could not load Community Chat');
      }
      const thread = threadData.thread || threadData;
      const rawTurns = Array.isArray(thread.turns) ? thread.turns : [];
      const expanded: HermesTurn[] = [];
      for (const turn of rawTurns) {
        const baseId = String(turn.id || `turn-${expanded.length}`);
        const userText = String(turn.user || turn.user_message || '').trim();
        const assistantText = String(turn.assistant || turn.assistant_message || '').trim();
        if (userText) {
          expanded.push({ id: `${baseId}-user`, text: userText, sender: 'user' });
        }
        if (assistantText) {
          expanded.push({ id: `${baseId}-assistant`, text: assistantText, sender: 'assistant' });
        }
      }
      setTurns(expanded);
      const access = accessData.access || accessData;
      const roster = access?.members;
      if (Array.isArray(roster) && roster.length) {
        setMembers(roster);
      } else if (access?.roles?.length) {
        setMembers([{ displayName: access.roles.join(', '), role: access.canPrompt ? 'can prompt' : 'watch' }]);
      } else {
        setMembers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, threadId]);

  useEffect(() => {
    if (!auth) return;
    void loadThread();
  }, [auth, loadThread]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [turns, busy]);

  const send = async (): Promise<void> => {
    const headers = authHeaders();
    const trimmed = input.trim();
    if (!headers || !trimmed || busy) return;
    setBusy(true);
    setError(null);
    const userTurn: HermesTurn = {
      id: `local-${Date.now()}`,
      text: trimmed,
      sender: 'user',
    };
    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    try {
      const history = turns.slice(-8).map((t) => ({
        sender: turnSender(t),
        text: turnText(t),
      }));
      const res = await fetch('/api/embed/hermes/community/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmed,
          threadId,
          surface,
          history,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Send failed');
      }
      const assistantTurn: HermesTurn = {
        id: `assistant-${Date.now()}`,
        text: String(data.response || ''),
        sender: 'assistant',
      };
      setTurns((prev) => [...prev.filter((t) => t.id !== userTurn.id), userTurn, assistantTurn]);
    } catch (err) {
      setTurns((prev) => prev.filter((t) => t.id !== userTurn.id));
      setInput(trimmed);
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  if (authError && !auth) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center bg-slate-950 p-4 text-center text-sm text-slate-400">
        {authError}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col bg-slate-950 text-slate-100">
      {members.length ? (
        <div className="shrink-0 border-b border-slate-800 px-3 py-2 text-[11px] text-slate-400">
          {members.length} member{members.length === 1 ? '' : 's'}
          {members.slice(0, 4).map((m) => (
            <span key={m.verifierId || m.displayName} className="ml-2 rounded bg-slate-900 px-1.5 py-0.5">
              {m.displayName || m.verifierId || 'Member'}
            </span>
          ))}
        </div>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="text-center text-sm text-slate-500">Loading conversation…</p>
        ) : turns.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            Community Chat is ready. Everyone invited can prompt Deepi.
          </p>
        ) : (
          <div className="space-y-3">
            {turns.map((turn) => {
              const isUser = turnSender(turn) === 'user';
              return (
                <div
                  key={turn.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    isUser ? 'ml-6 bg-cyan-950/50 text-cyan-50' : 'mr-4 bg-slate-900 text-slate-100'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{turnText(turn)}</p>
                  ) : (
                    <HermesMarkdown text={turnText(turn)} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error ? (
        <p className="shrink-0 border-t border-rose-900/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="shrink-0 border-t border-slate-800 p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Message Community Chat…"
            disabled={!auth || busy}
            className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="button"
            disabled={!auth || busy || !input.trim()}
            onClick={() => void send()}
            className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {busy ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
