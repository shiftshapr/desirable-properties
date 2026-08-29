import type { CivicChallengeActionId } from '@/data/civic-challenges/schema';
import { AI_HUMAN_AGENCY_META } from '@/data/pathways/ai-human-agency';
import { getCivicChallenge } from '@/lib/civic-challenges';
import { getDpRegistryEntry } from '@/lib/dp-registry';
import { getAllianceOrg } from '@/lib/hermes-onboard/directory';
import { patchSeed } from '@/lib/hermes-onboard/dp-directions';

/** Short-link intents resolved server-side on /agent (no prompt in the URL). */
export type AgentIntent =
  | Extract<CivicChallengeActionId, 'submit_problem' | 'curate'>
  | 'alliance_patch';

export type AgentHrefInput = {
  dp?: string | null;
  intent?: AgentIntent | null;
  /** Pathway slug, e.g. ai-human-agency */
  starter?: string | null;
  /** Alliance org pad slug (alliance_patch) */
  slug?: string | null;
  thread?: string | null;
  create?: string | null;
  from?: string | null;
  wg?: string | null;
  archive?: string | null;
  /** Legacy: full prompt in query string. Prefer intent + dp. */
  prompt?: string | null;
};

export type ResolvedAgentStarter = {
  initialPrompt: string | null;
  starterPrompts: string[] | null;
  starterLabel: string | null;
};

function normalizeDpId(dp: string): string {
  const trimmed = dp.trim();
  return trimmed.toUpperCase().startsWith('DP') ? trimmed.toUpperCase() : `DP${trimmed}`;
}

function catalogDpIdFromChallenge(challenge: NonNullable<ReturnType<typeof getCivicChallenge>>): string {
  if (challenge.number != null) return `DP${challenge.number}`;
  const m = String(challenge.id).match(/^dp(\d+)$/i);
  return m ? `DP${Number(m[1])}` : challenge.id.toUpperCase();
}

export function dpCompanionPrompt(dpParam: string): { prompt: string; label: string } | null {
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

export function civicIntentPrompt(
  intent: AgentIntent,
  dpParam: string,
): { prompt: string; label: string } | null {
  const entry = getDpRegistryEntry(dpParam);
  if (!entry) return null;
  const challenge = getCivicChallenge(entry.id);
  if (!challenge) return null;
  const catalogId = catalogDpIdFromChallenge(challenge);

  switch (intent) {
    case 'submit_problem':
      return {
        label: `${catalogId} campaign`,
        prompt: `I want to submit a real-world problem related to ${catalogId} (${challenge.title}). Guiding question: ${challenge.guidingQuestion}`,
      };
    case 'curate':
      return {
        label: `${catalogId} campaign`,
        prompt: `Help me curate community submissions related to ${catalogId} (${challenge.title}).`,
      };
    case 'alliance_patch':
      return null;
    default:
      return null;
  }
}

export function alliancePatchPrompt(
  slug: string,
  dpParam: string,
): { prompt: string; label: string } | null {
  const org = getAllianceOrg(slug);
  const entry = getDpRegistryEntry(dpParam);
  if (!org || !entry) return null;
  const seed = patchSeed(org, entry.id);
  const prompt = [
    `I am looking at the landing pad for ${org.name}.`,
    `Public mission we used: ${org.mission}`,
    `Desirable Property: ${entry.id} (${entry.name}).`,
    `Candidate patch direction (hypothesis until they confirm): ${seed.patchIdea}`,
    `Ask me what this org's public corpus already covers that the DP text is missing, then help me turn one concrete sentence into a Discuss patch.`,
  ].join(' ');
  return {
    label: `${org.shortName} · ${entry.id}`,
    prompt,
  };
}

/** Build a short /agent deep link (prompt resolved on the server). */
export function buildAgentHref(input: AgentHrefInput): string {
  const params = new URLSearchParams();
  if (input.dp?.trim()) params.set('dp', normalizeDpId(input.dp));
  if (input.intent?.trim()) params.set('intent', input.intent.trim());
  if (input.starter?.trim()) params.set('starter', input.starter.trim());
  if (input.slug?.trim()) params.set('slug', input.slug.trim());
  if (input.thread?.trim()) params.set('thread', input.thread.trim());
  if (input.create?.trim()) params.set('create', input.create.trim());
  if (input.from?.trim()) params.set('from', input.from.trim());
  if (input.wg?.trim()) params.set('wg', input.wg.trim());
  if (input.archive?.trim()) params.set('archive', input.archive.trim());
  if (input.prompt?.trim()) params.set('prompt', input.prompt.trim());
  const qs = params.toString();
  return qs ? `/agent?${qs}` : '/agent';
}

export function resolveAgentStarter(params: {
  prompt?: string | null;
  dp?: string | null;
  intent?: string | null;
  starter?: string | null;
  slug?: string | null;
}): ResolvedAgentStarter {
  const promptParam = params.prompt?.trim() || null;
  const dpParam = params.dp?.trim() || null;
  const intentParam = params.intent?.trim() || null;
  const starterParam = params.starter?.trim() || null;
  const slugParam = params.slug?.trim() || null;

  if (promptParam) {
    const fromAiPathway = starterParam === 'ai-human-agency';
    const dpStarter = dpParam ? dpCompanionPrompt(dpParam) : null;
    return {
      initialPrompt: promptParam,
      starterPrompts: fromAiPathway || dpStarter
        ? [promptParam]
        : null,
      starterLabel: dpStarter?.label
        ?? (fromAiPathway ? 'AI & Human Agency pathway' : null),
    };
  }

  if (starterParam === 'ai-human-agency') {
    const prompt = AI_HUMAN_AGENCY_META.hermesPrompt;
    return {
      initialPrompt: prompt,
      starterPrompts: [prompt],
      starterLabel: 'AI & Human Agency pathway',
    };
  }

  if (intentParam === 'alliance_patch' && dpParam && slugParam) {
    const resolved = alliancePatchPrompt(slugParam, dpParam);
    if (resolved) {
      return {
        initialPrompt: resolved.prompt,
        starterPrompts: [resolved.prompt],
        starterLabel: resolved.label,
      };
    }
  }

  if (intentParam && dpParam) {
    const civic = civicIntentPrompt(intentParam as AgentIntent, dpParam);
    if (civic) {
      return {
        initialPrompt: civic.prompt,
        starterPrompts: [civic.prompt],
        starterLabel: civic.label,
      };
    }
  }

  if (dpParam) {
    const dpStarter = dpCompanionPrompt(dpParam);
    if (dpStarter) {
      return {
        initialPrompt: dpStarter.prompt,
        starterPrompts: [dpStarter.prompt],
        starterLabel: dpStarter.label,
      };
    }
  }

  return {
    initialPrompt: null,
    starterPrompts: null,
    starterLabel: null,
  };
}
