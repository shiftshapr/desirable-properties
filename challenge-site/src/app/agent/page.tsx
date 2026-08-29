import type { Metadata } from 'next';
import HermesChat from '@/components/HermesChat';
import { resolveAgentStarter } from '@/lib/agent-starter';
import { readSession, sessionToAuthUser } from '@/lib/auth-session';

export const metadata: Metadata = {
  title: 'Deepi – Desirable Properties',
  description:
    'Deepi helps the community refine the Desirable Properties: coherence, impact, and governance continuity.',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export default async function AgentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await readSession();
  const initialUser = sessionToAuthUser(session);
  const params = await searchParams;
  const resolved = resolveAgentStarter({
    prompt: firstParam(params.prompt),
    dp: firstParam(params.dp),
    intent: firstParam(params.intent),
    starter: firstParam(params.starter),
    slug: firstParam(params.slug),
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-950">
      <HermesChat
        surface="desirableproperties.org/agent"
        initialSignedIn={Boolean(session)}
        initialUser={initialUser}
        initialPrompt={resolved.initialPrompt}
        starterPrompts={resolved.starterPrompts}
        starterLabel={resolved.starterLabel}
      />
    </div>
  );
}
