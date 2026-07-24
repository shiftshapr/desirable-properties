'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface HermesChatProps {
  apiPath?: string;
  surface?: string;
  dpFocus?: number | null;
  compact?: boolean;
}

const INTRO =
  "I'm Hermes. I work with the community to make the Desirable Properties as coherent and impactful as possible — clarifying tensions, connecting ideas to open Gov Hub proposals, and helping shape stronger contributions. What DP or governance question is on your mind?";

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
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `sess-${Date.now()}`,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `${Date.now()}-u`,
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
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
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          text: "Hermes couldn't connect right now. Please try again in a moment.",
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
        <div className="mx-auto flex max-w-3xl gap-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about a DP, a tension between properties, or how to strengthen a proposal…"
            className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600"
            rows={2}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
