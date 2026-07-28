/**
 * Canopi web-embed bridge for the DP book reader.
 * Keeps header above sidebar and listens for embed auth events.
 */
(function (global) {
  const CANOPI_ID = '7f3e9a2b-1c4d-5e6f-8a9b-0d1e2f3a4b5c';
  const AUTH_SESSION_KEY = 'dp-viewer-canopi-session';
  const AUTH_PAYLOAD_KEY = 'dp-viewer-canopi-auth-payload';
  const ALLOWED_ORIGINS = new Set([
    'https://api.canopi.live',
    'https://app.canopi.live',
    window.location.origin,
  ]);

  document.documentElement.classList.add('dp-header-above-canopi');

  global.DP_CANOPI = {
    id: CANOPI_ID,
    supportUrl: 'https://desirableproperties.org/support',
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
