const INTROSPECT_USER_SIGNALS = [
  /\bcompare\b.*\b(chatgpt|gpt|claude|gemini|other (?:ai|model|assistant))\b/i,
  /\b(vs\.?|versus)\b.*\b(chatgpt|gpt|claude|gemini)\b/i,
  /\bhow (?:do|does|would) (?:you|deepi|hermes)\b.*\bcompare\b/i,
  /\bintrospect\b/i,
  /\bself[- ]?evaluat/i,
  /\breflect on (?:this|your|the) (?:conversation|thread|reply|answer)\b/i,
  /\bwhat (?:did you|have you) learn/i,
  /\bmeta[- ]?lesson/i,
  /\bprocess (?:lesson|improvement|feedback)\b/i,
  /\bstructural lesson/i,
  /\banti[- ]?pattern/i,
  /\bhow (?:could|should|would) you (?:improve|do better|respond differently)\b/i,
  /\bstyle (?:guide|lesson|note)\b/i,
];

const INTROSPECT_REPLY_SIGNALS = [
  /\bstructural lesson/i,
  /\banti[- ]?pattern/i,
  /\bcompared to (?:chatgpt|gpt|claude|gemini)\b/i,
  /\b(?:chatgpt|gpt|claude|gemini)\b.*\b(?:does|would|tends to)\b/i,
  /\bself[- ]?evaluat/i,
  /\bmeta[- ]?lesson/i,
  /\bprocess (?:lesson|improvement)\b/i,
  /\b(?:what i (?:would|should) (?:do|change)|how i (?:would|should) (?:respond|answer))\b/i,
  /\b\d+\.\s*(?:lesson|pattern|takeaway|improvement)\b/i,
];

type ChatTurn = { sender?: string; role?: string; text?: string; content?: string };

export function detectIntrospectiveRequest(userMessage: string, history: ChatTurn[] = []) {
  const text = String(userMessage || '').trim();
  if (!text) return null;
  if (INTROSPECT_USER_SIGNALS.some((re) => re.test(text))) {
    return { signal: 'user_request' as const, text };
  }

  const recentUser = [...history]
    .reverse()
    .filter((t) => t.sender === 'user' || t.role === 'user')
    .slice(0, 2)
    .map((t) => String(t.text || t.content || '').trim())
    .filter(Boolean);
  if (recentUser.some((msg) => INTROSPECT_USER_SIGNALS.some((re) => re.test(msg)))) {
    return { signal: 'thread_context' as const, text };
  }

  return null;
}

export function detectIntrospectiveReply(assistantText: string) {
  const text = String(assistantText || '').trim();
  if (!text || text.length < 120) return null;

  const hits = INTROSPECT_REPLY_SIGNALS.filter((re) => re.test(text)).length;
  const numberedList = (text.match(/^\s*\d+[.)]\s+/gm) || []).length;
  const hasStructure = hits >= 1 || (numberedList >= 3 && /\b(lesson|pattern|takeaway|improve)\b/i.test(text));

  if (!hasStructure) return null;
  return { signal: hits >= 2 ? 'structured' as const : 'likely' as const, text };
}

export function shouldOfferSaveLearning(
  assistantText: string,
  priorMessages: ChatTurn[] = [],
) {
  if (detectIntrospectiveReply(assistantText)) return true;

  const userMessage = [...priorMessages]
    .reverse()
    .find((m) => m.sender === 'user' || m.role === 'user');
  const userText = String(userMessage?.text || userMessage?.content || '').trim();
  if (!userText) return false;

  return Boolean(detectIntrospectiveRequest(userText, priorMessages));
}
