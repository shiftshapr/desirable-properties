/**
 * Lightweight markdown → HTML for DP chapter content.
 * Supports paragraphs, headings (#, ##, ###), bullet lists (- ), ordered lists (1. ),
 * inline **bold**, *italic*, [label](url), and DP tag auto-linking.
 */
(function (global) {
  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Build an ordered TOC navigation index (chapter key → part info) so the
   * smart-tag renderer can link inline DP references to the correct chapter.
   * @param {Array<{key:string, partNumber:string, partTitle:string, dpId:string}>} chapters
   */
  function buildChapterIndex(chapters) {
    const byDp = {};
    chapters.forEach((c) => { if (c.dpId) byDp[c.dpId.toUpperCase()] = c; });
    return { chapters, byDp };
  }

  function linkifyDpTags(html, chapterIndex) {
    if (!chapterIndex) return html;
    // Replace DP<number> tokens that are not already inside an <a> or <code>.
    // We do a coarse pass: escape-aware – since we already have escaped text from the markdown step,
    // look for tokens like DP1, DP12 (1-2 digits) followed by a word boundary.
    return html.replace(/DP(\d{1,2})\b/g, (match, num) => {
      const dpId = 'DP' + num;
      const target = chapterIndex.byDp[dpId];
      if (!target) return match;
      return '<a class="dp-tag" href="#ch=' + target.key + '" data-dp-link="' + dpId + '">' + dpId + '</a>';
    });
  }

  function formatInlineRich(raw) {
    const src = String(raw || '');
    const tokens = [];
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0;
    let match;
    while ((match = linkRe.exec(src)) !== null) {
      if (match.index > last) tokens.push({ type: 'text', value: src.slice(last, match.index) });
      tokens.push({ type: 'link', label: match[1], href: match[2] });
      last = match.index + match[0].length;
    }
    if (last < src.length) tokens.push({ type: 'text', value: src.slice(last) });

    function formatTextChunk(text) {
      let out = escapeHtml(text);
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
      out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
      return out;
    }

    return tokens.map((token) => {
      if (token.type === 'text') return formatTextChunk(token.value);
      const href = String(token.href || '').trim();
      if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href) && !/^#/i.test(href)) {
        return formatTextChunk('[' + token.label + '](' + token.href + ')');
      }
      return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(token.label) + '</a>';
    }).join('');
  }

  /**
   * Block-level markdown:
   *   # / ## / ### headings, --- / *** horizontal rules,
   *   - bullet lists, 1. ordered lists, blank-line-separated paragraphs.
   * @param {string} s
   * @returns {string} safe HTML
   */
  function formatMarkdown(s) {
    let text = String(s || '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';

    // Force horizontal rules onto their own paragraphs.
    text = text.replace(/^[ \t]*(-{3,}|_{3,}|\*{3,})[ \t]*$/gm, '\n\n$1\n\n');

    const blocks = text.split(/\n{2,}/);
    const html = [];

    for (const block of blocks) {
      const lines = block.split('\n').map((line) => line.trimEnd()).filter((line) => line.trim() !== '');
      if (!lines.length) continue;

      if (lines.every((line) => /^(-{3,}|_{3,}|\*{3,})\s*$/.test(line.trim()))) {
        html.push('<hr>');
        continue;
      }

      const headingMatch = lines[0].match(/^(#{1,3})\s+(.+)$/);
      if (lines.length === 1 && headingMatch) {
        const level = Math.min(3, headingMatch[1].length);
        html.push('<h' + level + '>' + formatInlineRich(headingMatch[2].trim()) + '</h' + level + '>');
        continue;
      }

      const isBulletList = lines.every((line) => /^[-*+]\s+/.test(line.trim()));
      if (isBulletList) {
        const items = lines.map((line) => '<li>' + formatInlineRich(line.replace(/^[-*+]\s+/, '')) + '</li>').join('');
        html.push('<ul>' + items + '</ul>');
        continue;
      }

      const isOrderedList = lines.every((line) => /^\d+\.\s+/.test(line.trim()));
      if (isOrderedList) {
        const items = lines.map((line) => '<li>' + formatInlineRich(line.replace(/^\d+\.\s+/, '')) + '</li>').join('');
        html.push('<ol>' + items + '</ol>');
        continue;
      }

      const paragraph = lines.map((line) => formatInlineRich(line)).join('<br>');
      if (paragraph) html.push('<p>' + paragraph + '</p>');
    }

    return html.join('');
  }

  /**
   * Render markdown and linkify DPn tags to chapters using the supplied index.
   */
  function renderContent(markdown, chapterIndex) {
    const html = formatMarkdown(markdown);
    return linkifyDpTags(html, chapterIndex);
  }

  global.DPFormat = {
    escapeHtml: escapeHtml,
    formatInlineRich: formatInlineRich,
    formatMarkdown: formatMarkdown,
    linkifyDpTags: linkifyDpTags,
    buildChapterIndex: buildChapterIndex,
    renderContent: renderContent,
  };
})(typeof window !== 'undefined' ? window : globalThis);