'use client';

import { useEffect, useRef, useState } from 'react';
import {
  HERMES_DOC_ACCEPT,
  HERMES_DOC_MAX_COUNT,
  type PendingHermesDocument,
  readHermesDocument,
  toDocumentPayload,
} from '@/lib/hermesDocuments';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  attachments?: string[];
}

interface HermesChatProps {
  apiPath?: string;
  surface?: string;
  dpFocus?: number | null;
  compact?: boolean;
}

const INTRO =
  "I'm Hermes. I work with the community to make the Desirable Properties as coherent and impactful as possible — clarifying tensions, connecting ideas to open Gov Hub proposals, and helping shape stronger contributions. You can also upload .txt, .md, .pdf, or .docx files for review. What DP or governance question is on your mind?";

export default function HermesChat({
  apiPath = '/api/agent/chat',
  surface = 'desirableproperties.org',
  dpFocus = null,
  compact = false,
}: HermesChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'intro',
      text: INTRO,
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<PendingHermesDocument[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}`,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const onFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    setAttachError(null);

    const next = [...attachments];
    for (const file of Array.from(files)) {
      if (next.length >= HERMES_DOC_MAX_COUNT) {
        setAttachError(`Maximum ${HERMES_DOC_MAX_COUNT} documents per message`);
        break;
      }
      try {
        next.push(await readHermesDocument(file));
      } catch (err) {
        setAttachError(err instanceof Error ? err.message : 'Could not read file');
      }
    }
    setAttachments(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if ((!text && attachments.length === 0) || isLoading) return;

    const attachmentNames = attachments.map((doc) => doc.name);
    const displayText = text
      || (attachmentNames.length
        ? `Uploaded ${attachmentNames.join(', ')} for review`
        : '');

    const userMessage: Message = {
      id: `${Date.now()}-u`,
      text: displayText,
      sender: 'user',
      timestamp: new Date(),
      attachments: attachmentNames.length ? attachmentNames : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    const docsToSend = attachments;
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          documents: toDocumentPayload(docsToSend),
          history: messages.slice(-10).map((m) => ({ text: m.text, sender: m.sender })),
          surface,
          sessionId,
          dpFocus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          text: data.response,
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          text: err instanceof Error
            ? err.message
            : "Hermes couldn't connect right now. Please try again in a moment.",
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const shellClass = compact
    ? 'flex h-full min-h-[420px] flex-col rounded-xl border border-slate-800 bg-slate-950'
    : 'flex h-full min-h-0 flex-col bg-slate-950';

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-cyan-400">Hermes</p>
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            Desirable Properties community agent
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[80%] sm:text-base ${
                  message.sender === 'user'
                    ? 'bg-cyan-700 text-white'
                    : 'border border-slate-800 bg-slate-900 text-slate-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.attachments?.length ? (
                  <p className="mt-2 text-[11px] opacity-80">
                    Attached: {message.attachments.join(', ')}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] opacity-60">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-300">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0.2s]" />
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-slate-800 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-3">
          {attachments.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {attachments.map((doc) => (
                <li
                  key={doc.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                >
                  <span className="max-w-[220px] truncate">{doc.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(doc.id)}
                    className="text-slate-400 hover:text-white"
                    aria-label={`Remove ${doc.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {attachError ? <p className="text-xs text-rose-300">{attachError}</p> : null}
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={HERMES_DOC_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => onFilesSelected(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || attachments.length >= HERMES_DOC_MAX_COUNT}
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:border-cyan-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              title="Upload .txt, .md, .pdf, or .docx"
            >
              Attach
            </button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about a DP, upload a draft for review, or describe a governance tension…"
              className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
              rows={2}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={(!inputText.trim() && attachments.length === 0) || isLoading}
              className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
