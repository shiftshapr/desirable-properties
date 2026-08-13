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
    /** Staging host → staging Canopi API; prod book → prod API. pageUrlOrigin keeps pageIds aligned. */
    apiBase: staging ? 'https://staging.api.canopi.live' : 'https://api.canopi.live',
    embedId: CANOPI_ID,
    /** Staging host: Canopi pageId must match prod (book.desirableproperties.org). */
    pageUrlOrigin: staging ? 'https://book.desirableproperties.org' : undefined,
  };

  var SDK_ORIGIN = global.DP_CANOPI_CONFIG.apiBase.replace(/\/$/, '');

  var ALLOWED_ORIGINS = new Set([
    SDK_ORIGIN,
    'https://api.canopi.live',
    'https://staging.api.canopi.live',
    'https://app.canopi.live',
    window.location.origin,
  ]);

  /** Host auth popup – only before async v1.js loads; v1.js owns popups once CanopiEmbed is ready. */
  var _embedAuthPopupWin = null;

  function embedSdkOwnsAuthPopup() {
    return !!(global.__canopiEmbedReady__ || global.CanopiEmbed);
  }

  function isCanopiEmbedOrigin(origin) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return true;
    try {
      var host = new URL(origin).hostname;
      return host === 'api.canopi.live' || host === 'app.canopi.live' || host.endsWith('.canopi.live');
    } catch (e) {
      return false;
    }
  }

  function markReopenDiscussAfterAuth() {
    try {
      if (global.__canopiEmbedSidebarOpen__ || sessionStorage.getItem('dp_canopi_sidebar_open') === '1') {
        sessionStorage.setItem('dp_canopi_reopen_sidebar', '1');
      }
    } catch (e0) { /* ignore */ }
  }

  function openHostAuthPopup(url) {
    markReopenDiscussAfterAuth();
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
      markReopenDiscussAfterAuth();
      if (embedSdkOwnsAuthPopup()) return;
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

  function syncHostPushLayoutClass(isOpen) {
    document.documentElement.classList.toggle('dp-canopi-push-open', !!isOpen);
  }
  global.addEventListener('canopi:embed-sidebar-open', function () {
    syncHostPushLayoutClass(true);
    try { sessionStorage.setItem('dp_canopi_sidebar_open', '1'); } catch (e) {}
  });
  global.addEventListener('canopi:embed-sidebar-closed', function () {
    syncHostPushLayoutClass(false);
    try { sessionStorage.setItem('dp_canopi_sidebar_open', '0'); } catch (e) {}
  });
  global.addEventListener('canopi:embed-ready', function () {
    if (global.__canopiEmbedSidebarOpen__) syncHostPushLayoutClass(true);
  });

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

  function readStoredAuthPayload() {
    try {
      if (sessionStorage.getItem(AUTH_SESSION_KEY) !== '1') return null;
      var raw = sessionStorage.getItem(AUTH_PAYLOAD_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function normalizeAuthPayload(stored) {
    if (!stored) return null;
    if (stored.type === 'CANOPI_AUTH_SUCCESS' && stored.user && stored.user.id) return stored;
    if (stored.user && stored.user.id) {
      return {
        type: 'CANOPI_AUTH_SUCCESS',
        user: stored.user,
        session: stored.session || null,
        embedToken: stored.embedToken || stored.authToken || null,
      };
    }
    return null;
  }

  function applyStoredAuthToEmbed() {
    var embed = global.CanopiEmbed;
    if (!embed || typeof embed.setAuth !== 'function') return false;
    var payload = normalizeAuthPayload(readStoredAuthPayload());
    if (!payload) return false;
    embed.setAuth(payload);
    return true;
  }

  /** Same-tab sign-in return (#canopi_auth=…) when popup was blocked or auth ran in-page. */
  function consumeCanopiAuthHash() {
    try {
      var hash = String(location.hash || '');
      var marker = 'canopi_auth=';
      var idx = hash.indexOf(marker);
      if (idx < 0) return false;
      var token = hash.slice(idx + marker.length).split('&')[0];
      if (!token) return false;
      var b64 = token.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var msg = JSON.parse(atob(b64));
      if (!msg || msg.type !== 'CANOPI_AUTH_SUCCESS' || !msg.user || !msg.user.id) return false;
      persistAuthPayload(msg);
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch (eHist) { /* ignore */ }
      applyStoredAuthToEmbed();
      scheduleReopenDiscussAfterAuth();
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearAuthPayload() {
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(AUTH_PAYLOAD_KEY);
    } catch (e) { /* ignore */ }
  }

  function shouldReopenDiscussAfterAuth() {
    try {
      return sessionStorage.getItem('dp_canopi_reopen_sidebar') === '1'
        || sessionStorage.getItem('dp_canopi_sidebar_open') === '1';
    } catch (e) {
      return false;
    }
  }

  function clearReopenDiscussFlag() {
    try { sessionStorage.removeItem('dp_canopi_reopen_sidebar'); } catch (e) {}
  }

  function openDiscussSidebar() {
    var embed = global.CanopiEmbed;
    if (!embed || typeof embed.openSidebar !== 'function') return false;
    var pageUrl = global.dpChapterPageUrl(location.pathname || '/');
    embed.openSidebar({ pageUrl: pageUrl });
    return true;
  }

  function scheduleReopenDiscussAfterAuth() {
    if (!shouldReopenDiscussAfterAuth()) return;
    var delays = [0, 200, 500, 1000, 2000, 4000];
    var attempt = 0;
    function tryOpen() {
      if (!shouldReopenDiscussAfterAuth()) return;
      if (openDiscussSidebar()) {
        clearReopenDiscussFlag();
        return;
      }
      attempt += 1;
      if (attempt < delays.length) {
        setTimeout(tryOpen, delays[attempt]);
      }
    }
    if (openDiscussSidebar()) {
      clearReopenDiscussFlag();
      return;
    }
    if (global.__canopiEmbedReady__) {
      setTimeout(tryOpen, delays[0]);
      return;
    }
    global.addEventListener('canopi:embed-ready', function onAuthReady() {
      global.removeEventListener('canopi:embed-ready', onAuthReady);
      setTimeout(tryOpen, delays[0]);
    });
  }

  function handleAuthSuccessPayload(data) {
    persistAuthPayload(data);
    applyStoredAuthToEmbed();
    scheduleReopenDiscussAfterAuth();
  }

  global.addEventListener('message', function (ev) {
    if (!ev.data || typeof ev.data !== 'object') return;
    if (!ALLOWED_ORIGINS.has(String(ev.origin || ''))) return;
    if (ev.data.type === 'CANOPI_AUTH_SUCCESS') {
      handleAuthSuccessPayload(ev.data);
    }
    if (ev.data.type === 'CANOPI_AUTH_CLEAR' || ev.data.type === 'CANOPI_SIGN_OUT') {
      clearAuthPayload();
    }
  });

  global.addEventListener('canopi:auth-changed', function () {
    scheduleReopenDiscussAfterAuth();
  });

  /** ?discuss=1 — open Canopi Discuss sidebar (from challenge-site Discuss & Patch links). */
  function shouldAutoOpenDiscuss() {
    try {
      return new URLSearchParams(location.search).get('discuss') === '1';
    } catch (e) {
      return false;
    }
  }

  function scheduleDiscussAutoOpen() {
    if (!shouldAutoOpenDiscuss()) return;
    if (openDiscussSidebar()) return;
    global.addEventListener('canopi:embed-ready', function onReady() {
      global.removeEventListener('canopi:embed-ready', onReady);
      openDiscussSidebar();
    });
  }

  consumeCanopiAuthHash();
  global.addEventListener('canopi:embed-ready', function onEmbedAuthReady() {
    applyStoredAuthToEmbed();
  });

  scheduleDiscussAutoOpen();
})(window);
