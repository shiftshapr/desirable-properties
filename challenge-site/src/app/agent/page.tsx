import type { Metadata } from 'next';
import HermesChat from '@/components/HermesChat';
import { AI_HUMAN_AGENCY_META } from '@/data/pathways/ai-human-agency';
import { readSession, sessionToAuthUser } from '@/lib/auth-session';

export const metadata: Metadata = {
  title: 'Hermes – Desirable Properties',
  description:
    'Hermes helps the community refine the Desirable Properties – coherence, impact, and governance continuity.',
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
  const starter = firstParam(params.starter);
  const promptParam = firstParam(params.prompt);

  const fromAiPathway = starter === 'ai-human-agency';
  const initialPrompt = promptParam || (fromAiPathway ? AI_HUMAN_AGENCY_META.hermesPrompt : null);
  const starterPrompts = fromAiPathway || promptParam
    ? [initialPrompt || AI_HUMAN_AGENCY_META.hermesPrompt]
    : null;
  const starterLabel =
    fromAiPathway || promptParam ? 'AI & Human Agency pathway' : null;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-slate-950">
      <HermesChat
        surface="desirableproperties.org/agent"
        initialSignedIn={Boolean(session)}
        initialUser={initialUser}
        initialPrompt={initialPrompt}
        starterPrompts={starterPrompts}
        starterLabel={starterLabel}
      />
    </div>
  );
}
