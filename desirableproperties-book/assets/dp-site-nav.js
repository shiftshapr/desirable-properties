/**
 * Desirable Properties – shared site header (reader + subpages).
 * Renders the brand header, theme toggle, profile dropdown, and TOC button.
 * Lightweight (no Canopi, no auth backend). The profile dropdown is a stub
 * for the eventual DP Reader account; sign-in is graceful-degraded.
 */
(function (global) {
  const AUTH_STORAGE_KEY = 'dp-viewer-auth';
  const THEME_KEY = 'dp-viewer-theme';
  const PROFILE_ICON = '/assets/profile-icon.svg';
  const SITE_TITLE = 'The Desirable Properties of a Meta-Layer';

  let options = {};

  function isSignedIn() {
    try {
      return global.localStorage?.getItem(AUTH_STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function persistUser(user) {
    try {
      global.localStorage?.setItem(AUTH_STORAGE_KEY, '1');
      global.localStorage?.setItem('dp-viewer-user', JSON.stringify(user || {}));
    } catch (e) { /* ignore */ }
  }

  function clearAuth() {
    try {
      global.localStorage?.removeItem(AUTH_STORAGE_KEY);
      global.localStorage?.removeItem('dp-viewer-user');
    } catch (e) { /* ignore */ }
  }

  function statusLine() {
    if (!isSignedIn()) return 'Reader account';
    try {
      const raw = global.localStorage?.getItem('dp-viewer-user');
      const u = raw ? JSON.parse(raw) : null;
      if (u?.handle || u?.displayName || u?.name) {
        return '@' + (u.handle || u.displayName || u.name);
      }
      return 'Connected';
    } catch (e) {
      return 'Connected';
    }
  }

  function renderMount(root) {
    root.innerHTML =
      '<header class="dp-site-header">' +
      '  <div class="dp-site-header-inner dp-container dp-container-wide">' +
      '    <div class="dp-site-header-brand">' +
      '      <h1><a href="/" class="header-title-link" id="dpBrandLink">' + SITE_TITLE + '</a></h1>' +
      '      <p class="dp-site-page-title" id="dpSitePageTitle" hidden></p>' +
      '    </div>' +
      '    <div class="dp-site-header-tools">' +
      '      <div class="dp-badge-wrapper" id="dpNavBadgeWrapper">' +
      '        <button type="button" class="dp-profile-cluster" id="dpNavAuthTrigger" aria-haspopup="true" aria-expanded="false" aria-controls="dpNavAuthDropdown" title="Reader account menu">' +
      '          <img src="' + PROFILE_ICON + '" alt="" class="dp-profile-icon" id="dpNavAuthIcon" width="22" height="22" loading="lazy" />' +
      '          <span class="dp-profile-chevron" aria-hidden="true">▾</span>' +
      '        </button>' +
      '        <div class="dp-badge-dropdown" id="dpNavAuthDropdown">' +
      '          <div class="dp-badge-status" id="dpNavAuthStatus"></div>' +
      '          <a href="/viewer/intro" class="dp-menu-link" data-nav-page="reader">Reader</a>' +
      '          <a href="/book" class="dp-menu-link" data-nav-page="cover">Cover</a>' +
      '          <a href="https://www.desirableproperties.org" class="dp-menu-link" target="_blank" rel="noopener">DP community site</a>' +
      '          <a href="https://book.desirableproperties.org" class="dp-menu-link" target="_blank" rel="noopener">Book site</a>' +
      '          <button type="button" class="dp-menu-link" id="dpNavSignOut" hidden>Sign out</button>' +
      '        </div>' +
      '      </div>' +
      '      <button type="button" class="theme-toggle" id="dpNavTheme" title="Toggle dark/light" aria-label="Toggle theme">☾</button>' +
      '      <button type="button" class="toc-open-btn" id="dpNavToc" aria-label="Show table of contents" title="Show table of contents">☰ Contents</button>' +
      '    </div>' +
      '  </div>' +
      '</header>';
  }

  function initTheme() {
    let saved = 'dark';
    try {
      saved = global.localStorage?.getItem(THEME_KEY) || 'dark';
    } catch (e) { /* ignore */ }
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeButton(saved);
  }

  function updateThemeButton(theme) {
    const btn = document.getElementById('dpNavTheme');
    if (btn) btn.textContent = theme === 'dark' ? '☾' : '☀';
  }

  function toggleTheme() {
    const el = document.documentElement;
    const next = el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    el.setAttribute('data-theme', next);
    try { global.localStorage?.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
    updateThemeButton(next);
  }

  function updateUi() {
    const pageTitleEl = document.getElementById('dpSitePageTitle');
    if (pageTitleEl) {
      const title = options.pageTitle || '';
      if (title) {
        pageTitleEl.textContent = title;
        pageTitleEl.hidden = false;
      } else {
        pageTitleEl.hidden = true;
      }
    }

    const status = document.getElementById('dpNavAuthStatus');
    const trigger = document.getElementById('dpNavAuthTrigger');
    const signOut = document.getElementById('dpNavSignOut');
    if (status) status.textContent = isSignedIn() ? statusLine() : 'Reader account';
    if (trigger) trigger.title = isSignedIn() ? statusLine() : 'Reader account';
    if (signOut) signOut.hidden = !isSignedIn();

    document.querySelectorAll('[data-nav-page]').forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-nav-page') === options.page);
    });

    const tocBtn = document.getElementById('dpNavToc');
    if (tocBtn) tocBtn.classList.toggle('is-visible', !!options.showToc);
  }

  function setMenuOpen(open) {
    const wrapper = document.getElementById('dpNavBadgeWrapper');
    const menuTrigger = document.getElementById('dpNavAuthTrigger');
    if (!wrapper) return false;
    wrapper.classList.toggle('open', !!open);
    menuTrigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && typeof global.positionDpDropdown === 'function') {
      global.positionDpDropdown(wrapper);
    } else if (!open && typeof global.resetDpDropdownPosition === 'function') {
      global.resetDpDropdownPosition(wrapper);
    }
    if (typeof options.onMenuOpenChange === 'function') {
      options.onMenuOpenChange(!!open);
    }
    return !!open;
  }

  function bindEvents() {
    document.getElementById('dpNavTheme')?.addEventListener('click', toggleTheme);

    document.getElementById('dpNavSignOut')?.addEventListener('click', () => {
      setMenuOpen(false);
      clearAuth();
      updateUi();
      if (typeof options.onLogout === 'function') options.onLogout();
    });

    const trigger = document.getElementById('dpNavAuthTrigger');
    const toggleAuthMenu = () => {
      const wrapper = document.getElementById('dpNavBadgeWrapper');
      if (!wrapper) return;
      const open = !wrapper.classList.contains('open');
      setMenuOpen(open);
    };

    if (typeof global.bindDpDropdownTrigger === 'function') {
      global.bindDpDropdownTrigger(trigger, toggleAuthMenu);
    } else if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAuthMenu();
      });
    }

    if (typeof global.bindDpDropdownOutsideClose === 'function') {
      global.bindDpDropdownOutsideClose(
        () => document.getElementById('dpNavBadgeWrapper'),
        () => setMenuOpen(false)
      );
    } else {
      document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('dpNavBadgeWrapper');
        if (!wrapper?.classList.contains('open')) return;
        if (wrapper.contains(e.target)) return;
        setMenuOpen(false);
      });
    }

    document.getElementById('dpNavToc')?.addEventListener('click', () => {
      if (typeof options.onTocClick === 'function') options.onTocClick();
    });
  }

  function init(opts) {
    options = opts || {};
    const root = document.getElementById('dp-site-nav');
    if (!root) return;
    renderMount(root);
    if (options.page) root.dataset.page = options.page;
    initTheme();
    bindEvents();
    updateUi();
  }

  global.DPSiteNav = {
    init: init,
    update: updateUi,
    isSignedIn: isSignedIn,
    persistUser: persistUser,
    clearAuth: clearAuth,
    setMenuOpen: setMenuOpen,
  };
})(typeof window !== 'undefined' ? window : globalThis);