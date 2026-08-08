/**
 * Canopi web-embed bridge for desirableproperties.org (challenge-site).
 * Mirrors desirableproperties-book/assets/dp-canopi-bridge.js for non-book pages.
 */
(function (global) {
  'use strict';

  var host = (typeof location !== 'undefined' && location.hostname) || '';
  var staging =
    host === 'staging.desirableproperties.org'
    || host === 'staging.book.desirableproperties.org';
  var CANOPI_ID = '7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c';
  var AUTH_SESSION_KEY = 'dp-challenge-canopi-session';
  var AUTH_PAYLOAD_KEY = 'dp-challenge-canopi-auth-payload';

  global.DP_CANOPI_CONFIG = {
    apiBase: 'https://api.canopi.live',
    embedId: CANOPI_ID,
    /** Staging hosts: Canopi pageId must match prod desirableproperties.org. */
    pageUrlOrigin: staging ? 'https://desirableproperties.org' : undefined,
  };

  var SDK_ORIGIN = global.DP_CANOPI_CONFIG.apiBase.replace(/\/$/, '');

  var ALLOWED_ORIGINS = new Set([
    SDK_ORIGIN,
    'https://app.canopi.live',
    window.location.origin,
  ]);

  var _embedAuthPopupWin = null;

  function isCanopiEmbedOrigin(origin) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return true;
    try {
      var h = new URL(origin).hostname;
      return h === 'api.canopi.live' || h === 'app.canopi.live' || h.endsWith('.canopi.live');
    } catch (e) {
      return false;
    }
  }

  function openHostAuthPopup(url) {
    var w = 500;
    var h = 680;
    var left = Math.max(0, (screen.availWidth - w) / 2);
    var top = Math.max(0, (screen.availHeight - h) / 2);
    var features = 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes';
    if (_embedAuthPopupWin) {
      try {
        if (!_embedAuthPopupWin.closed) {
          _embedAuthPopupWin.focus();
          _embedAuthPopupWin.location.href = url;
          return _embedAuthPopupWin;
        }
      } catch (e) { /* COOP */ }
      _embedAuthPopupWin = null;
    }
    _embedAuthPopupWin = global.open(url, 'canopi_web3auth', features);
    return _embedAuthPopupWin;
  }

  function normalizeAuthPopupUrl(rawUrl) {
    var url = rawUrl;
    if (!url) {
      var params = new URLSearchParams({
        extensionId: 'canopi-web-embed',
        embedIframe: '1',
        reason: 'sign in',
      });
      try {
        params.set('returnUrl', global.location.href.split('#')[0]);
        params.set('parentOrigin', global.location.origin);
      } catch (e) {}
      url = SDK_ORIGIN + '/embed/web3auth-popup.html?' + params.toString();
    } else {
      try {
        var u = new URL(url);
        u.searchParams.set('embedIframe', '1');
        u.searchParams.set('extensionId', 'canopi-web-embed');
        try {
          u.searchParams.set('returnUrl', global.location.href.split('#')[0]);
          u.searchParams.set('parentOrigin', global.location.origin);
        } catch (e2) {}
        url = u.toString();
      } catch (e3) { /* use raw */ }
    }
    try {
      sessionStorage.setItem('canopi_embed_auth_return', global.location.href.split('#')[0]);
    } catch (e4) {}
    return url;
  }

  global.addEventListener('message', function (ev) {
    var data = ev.data;
    if (!data || typeof data !== 'object') return;
    if (data.__canopiOpenAuthPopup) {
      if (!isCanopiEmbedOrigin(String(ev.origin || ''))) return;
      var popupUrl = normalizeAuthPopupUrl(data.url);
      var win = openHostAuthPopup(popupUrl);
      if (ev.source) {
        try {
          ev.source.postMessage({ __canopiAuthPopupOpened: true, ok: !!win }, ev.origin || '*');
        } catch (e) {}
      }
    }
  });

  document.documentElement.classList.add('dp-header-above-canopi');

  global.DP_CANOPI = {
    id: CANOPI_ID,
    supportUrl: 'https://desirableproperties.org/support',
  };

  /** Canonical page URL for Canopi (strips staging host when configured). */
  global.dpCanopiPageUrl = function dpCanopiPageUrl(pagePath) {
    var origin = global.DP_CANOPI_CONFIG.pageUrlOrigin;
    if (!origin) {
      try { origin = location.origin; } catch (e) { origin = 'https://desirableproperties.org'; }
    }
    var path = String(pagePath || location.pathname || '/').replace(/^\/?/, '/');
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

  function shouldAutoOpenDiscuss() {
    try {
      return new URLSearchParams(location.search).get('discuss') === '1';
    } catch (e) {
      return false;
    }
  }

  function openDiscussSidebar() {
    var embed = global.CanopiEmbed;
    if (!embed || typeof embed.openSidebar !== 'function') return false;
    var pageUrl = global.dpCanopiPageUrl(location.pathname || '/');
    embed.openSidebar({ pageUrl: pageUrl });
    return true;
  }

  function scheduleDiscussAutoOpen() {
    if (!shouldAutoOpenDiscuss()) return;
    if (openDiscussSidebar()) return;
    global.addEventListener('canopi:embed-ready', function onReady() {
      global.removeEventListener('canopi:embed-ready', onReady);
      openDiscussSidebar();
    });
  }

  scheduleDiscussAutoOpen();

  /** Load v1.js after bridge (same order as book viewer.htm). */
  (function loadEmbedSdk() {
    var cfg = global.DP_CANOPI_CONFIG || {};
    var s = document.createElement('script');
    s.src = (cfg.apiBase || SDK_ORIGIN).replace(/\/$/, '') + '/embed/v1.js';
    s.setAttribute('data-canopi-id', cfg.embedId || CANOPI_ID);
    s.async = true;
    s.addEventListener('load', function () {
      try {
        global.dispatchEvent(new CustomEvent('canopi:embed-ready'));
      } catch (e) {}
      scheduleDiscussAutoOpen();
    });
    document.head.appendChild(s);
  })();
})(window);
