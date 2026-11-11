/**
 * Claude (Opus 5.5) for the Review tab and steering: Ask Deepi on a proposal or batch, and the anchor evaluation.
 *
 * Reads its own key, REVIEW_ANTHROPIC_API_KEY, and nothing else, so the rest of the site
 * (style check, Canopi assist, Deepi chat) stays on its MiniMax / Hermes configuration.
 */
import Anthropic from '@anthropic-ai/sdk';
import { styleGuideAsText } from '@/data/dp-style-guide';

export const REVIEW_MODEL = 'claude-opus-5-5';

export function reviewClaudeConfigured(): boolean {
  return Boolean(process.env.REVIEW_ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | null = null;

function reviewClient(): Anthropic {
  const apiKey = process.env.REVIEW_ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error('Claude is not configured on this server (REVIEW_ANTHROPIC_API_KEY).');
  if (!client) {
    // Explicit base URL: the box also runs Hermes with ANTHROPIC_BASE_URL set, which must not apply here.
    client = new Anthropic({ apiKey, baseURL: 'https://api.anthropic.com', maxRetries: 2, timeout: 180_000 });
  }
  return client;
}

export type ReviewClaudeCall = {
  text: string;
  model: string;
  latencyMs: number;
  inputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  outputTokens: number | null;
};

/**
 * One Messages call. `system` blocks are sent in order with a cache breakpoint on the last one, so
 * the stable context (instructions, style guide, chapter) is reused across questions on one chapter.
 * Policy declines fall back server-side (fallbacks: "default"); a final refusal throws.
 */
export async function callReviewClaude(opts: {
  system: string[];
  messages: Anthropic.Beta.BetaMessageParam[];
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
  jsonSchema?: Record<string, unknown>;
  /** Stream the request (needed for large max_tokens, so the HTTP request does not time out). */
  stream?: boolean;
}): Promise<ReviewClaudeCall> {
  const started = Date.now();
  const system: Anthropic.Beta.BetaTextBlockParam[] = opts.system.map((text, i) => ({
    type: 'text',
    text,
    ...(i === opts.system.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
  const params = {
    model: REVIEW_MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default' as const,
    system,
    messages: opts.messages,
    output_config: {
      effort: opts.effort ?? 'medium',
      ...(opts.jsonSchema ? { format: { type: 'json_schema' as const, schema: opts.jsonSchema } } : {}),
    },
  };
  const res = opts.stream
    ? await reviewClient().beta.messages.stream(params).finalMessage()
    : await reviewClient().beta.messages.create(params);
  if (res.stop_reason === 'refusal') {
    throw new Error('Claude declined to answer this one.');
  }
  const text = res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!text) throw new Error(res.stop_reason === 'max_tokens' ? 'The answer was cut off.' : 'Claude returned no text.');
  return {
    text,
    model: res.model,
    latencyMs: Date.now() - started,
    inputTokens: res.usage.input_tokens ?? null,
    cacheReadTokens: res.usage.cache_read_input_tokens ?? null,
    cacheWriteTokens: res.usage.cache_creation_input_tokens ?? null,
    outputTokens: res.usage.output_tokens ?? null,
  };
}

/**
 * Like callReviewClaude, but Claude may call the given tools (read-only lookups) before it answers.
 * Runs up to `maxTurns` rounds of tool calls, then returns the final text with summed token counts.
 */
export async function callReviewClaudeWithTools(opts: {
  system: string[];
  messages: Anthropic.Beta.BetaMessageParam[];
  tools: Anthropic.Beta.BetaTool[];
  runTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
  maxTurns?: number;
}): Promise<ReviewClaudeCall & { toolCalls: number }> {
  const started = Date.now();
  const system: Anthropic.Beta.BetaTextBlockParam[] = opts.system.map((text, i) => ({
    type: 'text',
    text,
    ...(i === opts.system.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
  const messages = [...opts.messages];
  const usage = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
  let toolCalls = 0;
  let model: string = REVIEW_MODEL;
  const maxTurns = opts.maxTurns ?? 6;
  for (let turn = 0; ; turn++) {
    const res = await reviewClient().beta.messages.create({
      model: REVIEW_MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default' as const,
      system,
      messages,
      // On the last round, no more lookups: answer with what was found.
      tools: turn < maxTurns ? opts.tools : undefined,
      output_config: { effort: opts.effort ?? 'medium' },
    });
    model = res.model;
    usage.input += res.usage.input_tokens ?? 0;
    usage.cacheRead += res.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += res.usage.cache_creation_input_tokens ?? 0;
    usage.output += res.usage.output_tokens ?? 0;
    if (res.stop_reason === 'refusal') throw new Error('Claude declined to answer this one.');
    if (res.stop_reason === 'tool_use') {
      const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const u of uses) {
        toolCalls++;
        const input = u.input && typeof u.input === 'object' ? (u.input as Record<string, unknown>) : {};
        results.push({ type: 'tool_result', tool_use_id: u.id, content: await opts.runTool(u.name, input) });
      }
      messages.push({ role: 'user', content: results });
      continue;
    }
    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!text) throw new Error(res.stop_reason === 'max_tokens' ? 'The answer was cut off.' : 'Claude returned no text.');
    return {
      text,
      model,
      latencyMs: Date.now() - started,
      inputTokens: usage.input,
      cacheReadTokens: usage.cacheRead,
      cacheWriteTokens: usage.cacheWrite,
      outputTokens: usage.output,
      toolCalls,
    };
  }
}

/** The chapter as Claude sees it: Gov Hub's Markdown blocks, numbered so answers can point at one. */
export function numberedChapter(dpId: string | null, passages: string[]): string {
  return [
    `The current text of ${dpId || 'this DP chapter'}, as numbered blocks (headings and paragraphs):`,
    '<chapter>',
    ...passages.map((p, i) => `[${i}] ${p}`),
    '</chapter>',
  ].join('\n\n');
}

export function styleGuideContext(): string {
  return styleGuideAsText();
}
