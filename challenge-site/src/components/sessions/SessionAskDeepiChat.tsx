'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { AuthUser } from '@/lib/auth-types';
import type { HermesChatContext } from '@/components/HermesChat';

const HermesChat = dynamic(() => import('@/components/HermesChat'), {
  ssr: false,
  loading: () => <p className="px-4 py-6 text-sm text-slate-300">Loading Deepi…</p>,
});

type Props = {
  surface: string;
  context: HermesChatContext;
  starterPrompts: string[];
  initialSignedIn: boolean;
  initialUser: AuthUser | null;
};

/**
 * Deepi, scoped to one meeting. Mounts only once its collapsed section is first opened, so the session page does
 * not load the chat (or its threads) for readers who never open it.
 */
export default function SessionAskDeepiChat({ surface, context, starterPrompts, initialSignedIn, initialUser }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const details = ref.current?.closest('details');
    if (!details) {
      setMounted(true);
      return;
    }
    const onToggle = () => {
      if (details.open) setMounted(true);
    };
    onToggle();
    details.addEventListener('toggle', onToggle);
    return () => details.removeEventListener('toggle', onToggle);
  }, []);

  return (
    <div ref={ref} className="flex h-[36rem] max-h-[80vh] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700">
      {mounted ? (
        <Suspense fallback={null}>
          <HermesChat
            compact
            surface={surface}
            context={context}
            starterPrompts={starterPrompts}
            starterLabel="About this meeting"
            initialSignedIn={initialSignedIn}
            initialUser={initialUser}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
