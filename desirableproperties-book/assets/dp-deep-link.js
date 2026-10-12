/**
 * Deep links into a chapter: a Canopi post link (?canopiMsg=<id>) or a text fragment (#:~:text=…)
 * opens the chapter AT the passage, highlighted. The browser's own text-fragment scroll runs before
 * the chapter has loaded, so it lands on the cover; this runs once the chapter has rendered.
 *
 * Phones (< 768px): a Discuss link must not open the full-screen panel over the chapter. The link is
 * held here, and `discuss` / `canopiOpen` are dropped from the URL before the Canopi bridge and SDK
 * read it. A floating "Discuss (n)" button opens the panel; while it is open, "Back to chapter"
 * closes it.
 *
 * Load BEFORE dp-canopi-bridge.js and the Canopi SDK (both read location.search).
 */
(function (global) {
  'use strict';

  var NARROW_QUERY = '(max-width: 767px)';
  var DP_DISCUSS_COMMUNITY_ID = 'abe5ec85-4ba6-456f-adaf-03d7d51cecf4';
  var RENDER_WAIT_MS = 15000;
  var HIGHLIGHT_NAME = 'dp-deep-link';

  function isNarrow() {
    try { return global.matchMedia(NARROW_QUERY).matches; } catch (e) { return false; }
  }

  function apiBase() {
    var host = (global.location && global.location.hostname) || '';
    var cfg = global.DP_CANOPI_CONFIG;
    if (cfg && cfg.apiBase) return String(cfg.apiBase).replace(/\/$/, '');
    return host === 'staging.book.desirableproperties.org' ? 'https://staging.api.canopi.live' : 'https://api.canopi.live';
  }

  /** `#:~:text=start[,end]` from the navigation URL (browsers hide it from location.hash). */
  function readTextFragment() {
    var urls = [];
    try {
      var nav = global.performance && global.performance.getEntriesByType && global.performance.getEntriesByType('navigation')[0];
      if (nav && nav.name) urls.push(nav.name);
    } catch (e) { /* ignore */ }
    try { urls.push(global.location.href); } catch (e) { /* ignore */ }
    for (var i = 0; i < urls.length; i++) {
      var m = /:~:(?:.*&)?text=([^&]+)/.exec(urls[i]);
      if (!m) continue;
      var parts = m[1].split(',').map(function (p) {
        try { return decodeURIComponent(p); } catch (e) { return p; }
      });
      // text=[prefix-,]start[,end][,-suffix]
      parts = parts.filter(function (p) { return !/-$/.test(p) && !/^-/.test(p); });
      if (parts[0]) return { start: parts[0], end: parts[1] || '' };
    }
    return null;
  }

  var params;
  try { params = new URLSearchParams(global.location.search); } catch (e) { params = new URLSearchParams(''); }

  var link = {
    messageId: (params.get('canopiMsg') || params.get('canopiMessage') || '').trim(),
    pageId: (params.get('canopiPageId') || '').trim(),
    wantsDiscuss: params.get('discuss') === '1' || params.get('canopiOpen') === '1' || params.get('canopiOpen') === 'true',
    fragment: readTextFragment(),
  };

  // Phones: hold the Discuss link here so nothing opens the full-screen panel on load.
  var deferDiscuss = isNarrow() && (link.wantsDiscuss || !!link.messageId);
  if (deferDiscuss) {
    try {
      ['discuss', 'canopiOpen', 'canopiMsg', 'canopiMessage', 'canopiPageId', 'canopiScope', 'canopiCommunity', 'canopiN']
        .forEach(function (k) { params.delete(k); });
      var qs = params.toString();
      global.history.replaceState(global.history.state, global.document.title, global.location.pathname + (qs ? '?' + qs : '') + global.location.hash);
    } catch (e) { /* ignore */ }
  }

  /* ---------- Find, scroll to and highlight the passage ---------- */

  /** Map the content root's text with whitespace removed, so block joins and line breaks never break a match. */
  function indexText(root) {
    var walker = global.document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var chars = [];
    var map = [];
    var node;
    while ((node = walker.nextNode())) {
      var t = node.nodeValue || '';
      for (var i = 0; i < t.length; i++) {
        if (/\s/.test(t[i])) continue;
        chars.push(t[i]);
        map.push([node, i]);
      }
    }
    return { text: chars.join(''), map: map };
  }

  function squash(s) {
    return String(s || '').replace(/\s+/g, '');
  }

  function findRange(root, start, end) {
    var idx = indexText(root);
    var s = squash(start);
    if (!s) return null;
    var from = idx.text.indexOf(s);
    if (from === -1 && s.length > 80) {
      s = s.slice(0, 80);
      from = idx.text.indexOf(s);
    }
    if (from === -1) return null;
    var to = from + s.length - 1;
    if (end) {
      var e = squash(end);
      var at = idx.text.indexOf(e, to + 1);
      if (at !== -1) to = at + e.length - 1;
    }
    var a = idx.map[from];
    var b = idx.map[to];
    var range = global.document.createRange();
    range.setStart(a[0], a[1]);
    range.setEnd(b[0], b[1] + 1);
    return range;
  }

  function blockOf(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    while (el && el.parentElement && !/^(P|LI|BLOCKQUOTE|H[1-6]|TD|DIV|SECTION)$/.test(el.tagName)) el = el.parentElement;
    return el;
  }

  function highlight(range) {
    var block = blockOf(range.startContainer);
    if (global.CSS && global.CSS.highlights && typeof global.Highlight === 'function') {
      global.CSS.highlights.set(HIGHLIGHT_NAME, new global.Highlight(range));
    } else if (block) {
      block.classList.add('dp-deep-link-block');
    }
    if (block) block.setAttribute('data-dp-deep-link', '1');
    return block;
  }

  function scrollToRange(range) {
    var block = blockOf(range.startContainer);
    if (block && block.scrollIntoView) block.scrollIntoView({ block: 'center', behavior: 'auto' });
  }

  function contentRoot() {
    return global.document.querySelector('[data-dp-content-root]');
  }

  /**
   * Call `attempt(root)` each time the chapter content changes, until RENDER_WAIT_MS passes.
   * The viewer can render a chapter more than once (Live/Onchain mode re-render), so one look
   * at the first render is not enough. `attempt` returns true once it has done its job for that root.
   */
  function onEachChapterRender(attempt) {
    var lastRoot = null;
    var settled = false;
    var pending = null;
    function check() {
      pending = null;
      var root = contentRoot();
      if (!root || (root.textContent || '').trim().length < 200) return;
      if (root === lastRoot && settled) return;
      lastRoot = root;
      settled = !!attempt(root);
    }
    function schedule() {
      if (pending) return;
      pending = setTimeout(check, 120);
    }
    var mo = new MutationObserver(schedule);
    mo.observe(global.document.documentElement, { childList: true, subtree: true });
    global.addEventListener('dp:chapter-rendered', schedule);
    setTimeout(function () {
      mo.disconnect();
      global.removeEventListener('dp:chapter-rendered', schedule);
    }, RENDER_WAIT_MS);
    schedule();
  }

  function fetchJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' }, credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function anchorForLink() {
    if (link.messageId && /^[0-9a-f-]{36}$/i.test(link.messageId)) {
      return fetchJson(apiBase() + '/api/messages/' + encodeURIComponent(link.messageId)).then(function (m) {
        var anchor = m && m.contextAnchor;
        // The messages API returns contextAnchor as a JSON string.
        if (typeof anchor === 'string') {
          try { anchor = JSON.parse(anchor); } catch (e) { anchor = null; }
        }
        var exact = anchor && anchor.textQuote && anchor.textQuote.exact;
        return exact ? { start: exact, end: '' } : link.fragment;
      });
    }
    return Promise.resolve(link.fragment);
  }

  function goToPassage() {
    if (!link.messageId && !link.fragment) return;
    anchorForLink().then(function (anchor) {
      if (!anchor) return;
      var userScrolled = false;
      global.addEventListener('wheel', function () { userScrolled = true; }, { once: true, passive: true });
      global.addEventListener('touchmove', function () { userScrolled = true; }, { once: true, passive: true });
      onEachChapterRender(function (root) {
        var range = findRange(root, anchor.start, anchor.end);
        if (!range) return false;
        highlight(range);
        if (!userScrolled) {
          global.requestAnimationFrame(function () { scrollToRange(range); });
          // Images above the passage can still load and push it down; scroll again once.
          setTimeout(function () { if (!userScrolled && range.startContainer.isConnected) scrollToRange(range); }, 900);
        }
        global.__dpDeepLinkPassage__ = true;
        try { global.dispatchEvent(new CustomEvent('dp:deep-link-passage', { detail: { messageId: link.messageId || null } })); } catch (e) { /* ignore */ }
        return true;
      });
    });
  }

  /* ---------- Phones: Discuss (n) and Back to chapter ---------- */

  function chapterPageId() {
    if (link.pageId) return link.pageId;
    var m = /\/viewer\/(dp\d{2})/.exec(global.location.pathname || '');
    return m ? 'book_desirableproperties_org_viewer_' + m[1] : '';
  }

  function chapterPageUrl() {
    if (typeof global.dpChapterPageUrl === 'function') return global.dpChapterPageUrl(global.location.pathname || '/');
    return 'https://book.desirableproperties.org' + (global.location.pathname || '/');
  }

  function el(tag, attrs, text) {
    var n = global.document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text) n.textContent = text;
    return n;
  }

  function openDiscuss() {
    var embed = global.CanopiEmbed;
    if (!embed) return false;
    if (link.messageId && typeof embed.openDiscussMessage === 'function') {
      embed.openDiscussMessage({
        messageId: link.messageId,
        pageUrl: chapterPageUrl(),
        pageId: chapterPageId() || undefined,
        shareDeepLink: true,
      });
      return true;
    }
    if (typeof embed.openSidebar === 'function') {
      embed.openSidebar({ pageUrl: chapterPageUrl() });
      return true;
    }
    return false;
  }

  function closeDiscuss() {
    var embed = global.CanopiEmbed;
    if (embed && typeof embed.closeSidebar === 'function') {
      embed.closeSidebar();
      return true;
    }
    return false;
  }

  function mountPhoneControls() {
    if (!isNarrow()) return;
    var doc = global.document;
    var discussBtn = el('button', { type: 'button', class: 'dp-discuss-fab', 'aria-label': 'Open discussion' }, 'Discuss');
    var backBtn = el('button', { type: 'button', class: 'dp-back-to-chapter', hidden: '' }, '← Back to chapter');
    discussBtn.addEventListener('click', function () {
      if (!openDiscuss()) {
        // SDK not ready yet: open as soon as it is.
        global.addEventListener('canopi:embed-ready', function once() {
          global.removeEventListener('canopi:embed-ready', once);
          openDiscuss();
        });
      }
    });
    backBtn.addEventListener('click', function () { closeDiscuss(); });
    doc.body.appendChild(discussBtn);
    doc.body.appendChild(backBtn);

    function sync(open) {
      discussBtn.hidden = !!open;
      backBtn.hidden = !open || !(global.CanopiEmbed && typeof global.CanopiEmbed.closeSidebar === 'function');
    }
    global.addEventListener('canopi:embed-sidebar-open', function () { sync(true); });
    global.addEventListener('canopi:embed-sidebar-closed', function () { sync(false); });
    sync(!!global.__canopiEmbedSidebarOpen__);

    var pageId = chapterPageId();
    if (!pageId) return;
    fetchJson(apiBase() + '/api/messages?communityId=' + DP_DISCUSS_COMMUNITY_ID + '&pageId=' + encodeURIComponent(pageId) + '&limit=100')
      .then(function (data) {
        var items = (data && data.items) || [];
        var n = items.filter(function (m) { return !m.parentId; }).length;
        if (n > 0) discussBtn.textContent = 'Discuss (' + (n >= 100 ? '100+' : n) + ')';
      });
  }

  global.DP_DEEP_LINK = { link: link, deferDiscuss: deferDiscuss, openDiscuss: openDiscuss, findRange: findRange };

  goToPassage();
  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', mountPhoneControls);
  } else {
    mountPhoneControls();
  }
})(window);
