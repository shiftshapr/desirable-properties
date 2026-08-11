/**
 * Strip common markdown formatting for plain textarea insertion.
 * Preview modals should still render markdown via HermesMarkdown.
 */
export function markdownToPlainText(markdown: string): string {
  let text = String(markdown ?? '');

  // Fenced code blocks → inner content
  text = text.replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1');

  // Inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // Images ![alt](url) → alt
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Links [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // Bold **text** or __text__
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');

  // Italic *text* or _text_
  text = text.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '$1');
  text = text.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '$1');

  // Headings
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Blockquotes
  text = text.replace(/^>\s?/gm, '');

  // Horizontal rules
  text = text.replace(/^[-*_]{3,}\s*$/gm, '');

  // Unordered lists
  text = text.replace(/^[\t ]*[-*+]\s+/gm, '');

  // Ordered lists
  text = text.replace(/^[\t ]*\d+\.\s+/gm, '');

  // Strikethrough
  text = text.replace(/~~([^~]+)~~/g, '$1');

  return text.trim();
}
