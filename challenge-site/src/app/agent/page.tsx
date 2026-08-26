import type { Metadata } from 'next';
import HermesChat from '@/components/HermesChat';
import { AI_HUMAN_AGENCY_META } from '@/data/pathways/ai-human-agency';
import { readSession, sessionToAuthUser } from '@/lib/auth-session';
import { getCivicChallenge } from '@/lib/civic-challenges';
import { getDpRegistryEntry } from '@/lib/dp-registry';

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

function dpStarterPrompt(dpParam: string): { prompt: string; label: string } | null {
  const entry = getDpRegistryEntry(dpParam);
  if (!entry) return null;
  const challenge = getCivicChallenge(entry.id);
  if (challenge) {
    return {
      label: `${entry.id} campaign`,
      prompt: `Let's explore ${entry.id} (${challenge.title}). Guiding question: ${challenge.guidingQuestion} Human issue: ${challenge.humanIssue}. Help me contribute.`,
    };
  }
  return {
    label: entry.id,
    prompt: `Let's explore ${entry.id} (${entry.name}). ${entry.description}`,
  };
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
  const dpParam = firstParam(params.dp);

  const fromAiPathway = starter === 'ai-human-agency';
  const dpStarter = dpParam ? dpStarterPrompt(dpParam) : null;
  const initialPrompt =
    promptParam ||
    dpStarter?.prompt ||
    (fromAiPathway ? AI_HUMAN_AGENCY_META.hermesPrompt : null);
  const starterPrompts =
    fromAiPathway || promptParam || dpStarter
      ? [initialPrompt || AI_HUMAN_AGENCY_META.hermesPrompt]
      : null;
  const starterLabel = dpStarter
    ? dpStarter.label
    : fromAiPathway || promptParam
      ? 'AI & Human Agency pathway'
      : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-950">
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
