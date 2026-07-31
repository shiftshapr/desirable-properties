/**
 * Canopi web-embed bridge for the DP book reader.
 * Keeps header above sidebar and listens for embed auth events.
 * Staging host mirrors prod API + pageUrlOrigin for pageIds (metaweb-book pattern).
 */
(function (global) {
  'use strict';

  var host = (typeof location !== 'undefined' && location.hostname) || '';
  var staging = host === 'staging.book.desirableproperties.org';
  var CANOPI_ID = '7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c';
  var AUTH_SESSION_KEY = 'dp-viewer-canopi-session';
  var AUTH_PAYLOAD_KEY = 'dp-viewer-canopi-auth-payload';

  global.DP_CANOPI_CONFIG = {
    /** Staging HTML uses prod Canopi API (embed + messages share prod pageIds). */
    apiBase: 'https://api.canopi.live',
    embedId: CANOPI_ID,
    /** Staging host: Canopi pageId must match prod (book.desirableproperties.org). */
    pageUrlOrigin: staging ? 'https://book.desirableproperties.org' : undefined,
  };

  var ALLOWED_ORIGINS = new Set([
    global.DP_CANOPI_CONFIG.apiBase.replace(/\/$/, ''),
    'https://app.canopi.live',
    window.location.origin,
  ]);

  document.documentElement.classList.add('dp-header-above-canopi');

  global.DP_CANOPI = {
    id: CANOPI_ID,
    supportUrl: 'https://desirableproperties.org/support',
  };

  /** Canonical page URL for Canopi (strips staging host prefix when configured). */
  global.dpChapterPageUrl = function dpChapterPageUrl(chapterPath) {
    var origin = global.DP_CANOPI_CONFIG.pageUrlOrigin;
    if (!origin) {
      try { origin = location.origin; } catch (e) { origin = 'https://book.desirableproperties.org'; }
    }
    var path = String(chapterPath || '').replace(/^\/?/, '/');
    return origin.replace(/\/$/, '') + path;
  };

  function persistAuthPayload(payload) {
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, '1');
      sessionStorage.setItem(AUTH_PAYLOAD_KEY, JSON.stringify(payload || {}));
    } catch (e) { /* ignore */ }
  }

  function clearAuthPayload() {
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_PAYLOAD_KEY);
    } catch (e) { /* ignore */ }
  }

  global.addEventListener('message', function (ev) {
    if (!ev.data || typeof ev.data !== 'object') return;
    if (!ALLOWED_ORIGINS.has(String(ev.origin || ''))) return;
    if (ev.data.type === 'CANOPI_AUTH_SUCCESS') {
      persistAuthPayload(ev.data.payload || ev.data.user || ev.data);
    }
    if (ev.data.type === 'CANOPI_AUTH_CLEAR' || ev.data.type === 'CANOPI_SIGN_OUT') {
      clearAuthPayload();
    }
  });
})(window);
