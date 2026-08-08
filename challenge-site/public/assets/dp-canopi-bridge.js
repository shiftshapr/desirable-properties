/**
 * Canopi web-embed bridge for desirableproperties.org (challenge-site).
 * Host auth sync mirrors metaweb-book/assets/metaweb-site-nav.js so users
 * signed in on the challenge-site reuse their session in Discuss without a
 * Web3Auth popup. Popup handling is left to embed/v1.js (single handler).
 */
(function (global) {
  'use strict';

  var host = (typeof location !== 'undefined' && location.hostname) || '';
  var staging = host === 'staging.desirableproperties.org';
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

  function isCanopiEmbedOrigin(origin) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return true;
    try {
      var h = new URL(origin).hostname;
      return h === 'api.canopi.live' || h === 'app.canopi.live' || h.endsWith('.canopi.live');
    } catch (e) {
      return false;
    }
  }

  var _embedAuthPopupWin = null;

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

  /** Always pin returnUrl to this page (never stale book URLs on api.canopi.live). */
  function normalizeAuthPopupUrl(rawUrl) {
    var pageReturn = global.location.href.split('#')[0];
    var parentOrigin = global.location.origin;
    var url = rawUrl;
    if (!url) {
      var params = new URLSearchParams({
        extensionId: 'canopi-web-embed',
        embedIframe: '1',
        reason: 'sign in',
        returnUrl: pageReturn,
        parentOrigin: parentOrigin,
      });
      url = SDK_ORIGIN + '/embed/web3auth-popup.html?' + params.toString();
    } else {
      try {
        var u = new URL(url);
        u.searchParams.set('embedIframe', '1');
        u.searchParams.set('extensionId', 'canopi-web-embed');
        u.searchParams.set('returnUrl', pageReturn);
        u.searchParams.set('parentOrigin', parentOrigin);
        url = u.toString();
      } catch (e3) { /* use raw */ }
    }
    try {
      sessionStorage.setItem('canopi_embed_auth_return', pageReturn);
    } catch (e4) {}
    return url;
  }

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

  function readAuthPayload() {
    try {
      var raw = sessionStorage.getItem(AUTH_PAYLOAD_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function persistAuthPayload(payload) {
    if (!payload || !payload.user || !payload.user.id) return false;
    var stored = {
      type: payload.type || 'CANOPI_AUTH_SUCCESS',
      user: payload.user,
      session: payload.session || null,
      embedToken: typeof payload.embedToken === 'string' && payload.embedToken ? payload.embedToken : null,
    };
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, '1');
      sessionStorage.setItem(AUTH_PAYLOAD_KEY, JSON.stringify(stored));
    } catch (e) {
      return false;
    }
    return true;
  }

  function clearAuthPayload() {
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_PAYLOAD_KEY);
    } catch (e) { /* ignore */ }
  }

  function getEmbedToken() {
    var payload = readAuthPayload();
    if (payload && typeof payload.embedToken === 'string' && payload.embedToken) {
      return payload.embedToken;
    }
    return '';
  }

  function decodeEmbedTokenPayload(token) {
    var parts = String(token || '').trim().split('.');
    if (parts.length < 2) return null;
    try {
      var b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
      var padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch (e) {
      return null;
    }
  }

  function isEmbedTokenFresh(token, skewMs) {
    var payload = decodeEmbedTokenPayload(token);
    if (!payload || typeof payload.exp !== 'number') return false;
    var skew = typeof skewMs === 'number' ? skewMs : 5 * 60 * 1000;
    return payload.exp * 1000 > Date.now() + skew;
  }

  function pushEmbedAuthToCanopi() {
    var payload = readAuthPayload();
    if (!payload || !payload.user || !payload.user.id || !payload.embedToken) return false;
    var detail = {
      type: payload.type || 'CANOPI_AUTH_SUCCESS',
      user: payload.user,
      session: payload.session || null,
      embedToken: payload.embedToken,
    };
    try {
      if (global.CanopiEmbed && typeof global.CanopiEmbed.setAuth === 'function') {
        global.CanopiEmbed.setAuth(detail);
      } else {
        global.dispatchEvent(new CustomEvent('canopi:host-auth', { detail: detail }));
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function refreshEmbedToken() {
    var payload = readAuthPayload();
    var userId = payload && payload.user && payload.user.id ? String(payload.user.id) : '';
    if (!userId) return Promise.resolve('');
    var body = { userId: userId };
    if (payload && payload.embedToken) body.embedToken = payload.embedToken;
    var headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    var sessionToken = payload && payload.session && payload.session.access_token;
    if (sessionToken) headers.Authorization = 'Bearer ' + sessionToken;
    return fetch('/api/auth/canopi/refresh-embed', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify(body),
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.embedToken) return '';
        persistAuthPayload({
          type: 'CANOPI_AUTH_SUCCESS',
          user: payload.user,
          session: payload.session || null,
          embedToken: j.embedToken,
        });
        return j.embedToken;
      })
      .catch(function () { return ''; });
  }

  function fetchHostEmbedSession() {
    return fetch('/api/auth/canopi/embed-session', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.ok || !j.user || !j.user.id || !j.embedToken) return false;
        return persistAuthPayload(j);
      })
      .catch(function () { return false; });
  }

  function ensureEmbedAuth(forceHostSession) {
    var existing = getEmbedToken();
    if (existing && isEmbedTokenFresh(existing)) {
      return Promise.resolve(pushEmbedAuthToCanopi());
    }
    if (existing) {
      return refreshEmbedToken().then(function (refreshed) {
        if (refreshed) return pushEmbedAuthToCanopi();
        if (forceHostSession) return fetchHostEmbedSession().then(function (ok) { return ok && pushEmbedAuthToCanopi(); });
        return false;
      });
    }
    if (forceHostSession) {
      return fetchHostEmbedSession().then(function (ok) { return ok && pushEmbedAuthToCanopi(); });
    }
    return Promise.resolve(false);
  }

  /** COOP redirect fallback: web3auth-popup appends #canopi_auth= to returnUrl. */
  function consumeCanopiAuthFromHash() {
    try {
      var hash = global.location.hash || '';
      var m = hash.match(/(?:^#|[&#])canopi_auth=([^&]+)/);
      if (!m) return false;
      var b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
      var json = JSON.parse(atob(b64));
      if (!json || !json.user || !json.user.id) return false;
      persistAuthPayload({
        type: json.type || 'CANOPI_AUTH_SUCCESS',
        user: json.user,
        embedToken: json.embedToken || null,
        session: json.session || null,
      });
      var clean = global.location.pathname + global.location.search;
      global.history.replaceState(null, '', clean);
      return true;
    } catch (e) {
      return false;
    }
  }

  global.addEventListener('message', function (ev) {
    if (!ev.data || typeof ev.data !== 'object') return;
    if (!ALLOWED_ORIGINS.has(String(ev.origin || ''))) return;
    if (ev.data.type === 'CANOPI_AUTH_SUCCESS') {
      persistAuthPayload(ev.data.payload || ev.data);
      pushEmbedAuthToCanopi();
    }
    if (ev.data.type === 'CANOPI_AUTH_CLEAR' || ev.data.type === 'CANOPI_SIGN_OUT') {
      clearAuthPayload();
      if (global.CanopiEmbed && typeof global.CanopiEmbed.clearAuth === 'function') {
        global.CanopiEmbed.clearAuth();
      }
    }
  });

  /**
   * Capture-phase sole popup handler — reuses host session when possible; otherwise
   * opens Web3Auth popup with returnUrl pinned to this challenge-site page.
   */
  global.addEventListener('message', function (ev) {
    var data = ev.data;
    if (!data || typeof data !== 'object' || !data.__canopiOpenAuthPopup) return;
    if (!isCanopiEmbedOrigin(String(ev.origin || ''))) return;

    ev.stopImmediatePropagation();

    ensureEmbedAuth(true).then(function (synced) {
      if (synced) {
        if (ev.source) {
          try {
            ev.source.postMessage({ __canopiAuthPopupOpened: true, ok: true }, ev.origin || '*');
          } catch (e) {}
        }
        return;
      }
      var popupUrl = normalizeAuthPopupUrl(data.url);
      var win = openHostAuthPopup(popupUrl);
      if (ev.source) {
        try {
          ev.source.postMessage({ __canopiAuthPopupOpened: true, ok: !!win }, ev.origin || '*');
        } catch (e2) {}
      }
    });
  }, true);

  global.addEventListener('canopi:auth-changed', function (ev) {
    var u = ev && ev.detail && ev.detail.user;
    if (!u || !u.id || (ev.detail && ev.detail.source === 'host')) return;
    var existing = readAuthPayload();
    persistAuthPayload({
      type: 'CANOPI_AUTH_SUCCESS',
      user: Object.assign({}, (existing && existing.user) || {}, u, { id: u.id }),
      embedToken: (ev.detail && ev.detail.embedToken) || (existing && existing.embedToken) || null,
      session: (ev.detail && ev.detail.session) || (existing && existing.session) || null,
    });
    void ensureEmbedAuth(false);
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

  function onEmbedReady() {
    if (consumeCanopiAuthFromHash()) pushEmbedAuthToCanopi();
    void ensureEmbedAuth(true).then(function () { pushEmbedAuthToCanopi(); });
    scheduleDiscussAutoOpen();
  }

  scheduleDiscussAutoOpen();
  if (consumeCanopiAuthFromHash()) {
    void ensureEmbedAuth(false).then(function () { pushEmbedAuthToCanopi(); });
  } else {
    void ensureEmbedAuth(true);
  }

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
      onEmbedReady();
    });
    document.head.appendChild(s);
  })();
})(window);
