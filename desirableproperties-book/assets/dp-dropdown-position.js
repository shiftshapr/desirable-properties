/**
 * Desirable Properties — auth/profile dropdown positioning helper.
 * Keeps the profile dropdown inside the viewport (open-up when near bottom edge).
 * Simplified fork of metaweb-book's auth-dropdown-position.js (no Canopi stacking).
 */
(function (global) {
  const PAD = 12;
  const MIN_MENU_HEIGHT = 120;
  const MAX_MENU_WIDTH = 320;
  const PREFERRED_MENU_WIDTH = 280;

  function resetDropdownPosition(wrapper) {
    if (!wrapper) return;
    wrapper.classList.remove('dp-dropdown-align-start', 'dp-dropdown-open-up');
    const dropdown = wrapper.querySelector('.dp-badge-dropdown');
    if (!dropdown) return;
    dropdown.style.removeProperty('position');
    dropdown.style.removeProperty('top');
    dropdown.style.removeProperty('bottom');
    dropdown.style.removeProperty('left');
    dropdown.style.removeProperty('right');
    dropdown.style.removeProperty('width');
    dropdown.style.removeProperty('min-width');
    dropdown.style.removeProperty('max-width');
    dropdown.style.removeProperty('max-height');
    dropdown.style.removeProperty('overflow-y');
    dropdown.style.removeProperty('z-index');
    dropdown.style.removeProperty('background');
    dropdown.style.removeProperty('color');
    dropdown.style.removeProperty('border-color');
    dropdown.style.removeProperty('box-shadow');
  }

  function positionDropdown(wrapper) {
    if (!wrapper || !wrapper.classList.contains('open')) {
      resetDropdownPosition(wrapper);
      return;
    }
    const dropdown = wrapper.querySelector('.dp-badge-dropdown');
    if (!dropdown) return;

    resetDropdownPosition(wrapper);

    requestAnimationFrame(() => {
      if (!wrapper.classList.contains('open')) return;

      const trigger = wrapper.querySelector('.dp-profile-cluster') || wrapper;
      const triggerRect = trigger.getBoundingClientRect();
      const viewportH = global.innerHeight;
      const viewportW = global.innerWidth;
      const spaceAbove = Math.max(0, triggerRect.top - PAD);
      const spaceBelow = Math.max(0, viewportH - triggerRect.bottom - PAD);
      const naturalHeight = dropdown.scrollHeight;

      const maxAllowedWidth = Math.max(1, viewportW - PAD * 2);
      const minWidth = 240;
      const width = Math.min(
        MAX_MENU_WIDTH,
        Math.max(minWidth, Math.min(PREFERRED_MENU_WIDTH, maxAllowedWidth))
      );

      let openUp = false;
      const probe = dropdown.getBoundingClientRect();
      if (probe.bottom > viewportH - PAD) {
        openUp = true;
      }

      if (openUp && spaceAbove < MIN_MENU_HEIGHT && spaceBelow > spaceAbove) {
        openUp = false;
      } else if (!openUp && spaceBelow < MIN_MENU_HEIGHT && spaceAbove > spaceBelow) {
        openUp = true;
      }

      let maxH = openUp ? spaceAbove : Math.max(MIN_MENU_HEIGHT, spaceBelow);

      dropdown.style.position = 'fixed';
      dropdown.style.zIndex = '2147483647';
      dropdown.style.width = width + 'px';
      dropdown.style.minWidth = '0';
      dropdown.style.maxWidth = Math.min(MAX_MENU_WIDTH, viewportW - PAD * 2) + 'px';

      const roomToRight = viewportW - triggerRect.left - PAD;
      if (roomToRight >= width) {
        dropdown.style.left = Math.max(PAD, triggerRect.left) + 'px';
        dropdown.style.right = 'auto';
      } else {
        dropdown.style.right = Math.max(PAD, viewportW - triggerRect.right) + 'px';
        dropdown.style.left = 'auto';
      }
      dropdown.style.maxHeight = maxH + 'px';
      dropdown.style.overflowY = naturalHeight > maxH ? 'auto' : '';

      if (openUp) {
        wrapper.classList.add('dp-dropdown-open-up');
        dropdown.style.top = 'auto';
        dropdown.style.bottom = Math.max(PAD, viewportH - triggerRect.top + 4) + 'px';
      } else {
        dropdown.style.top = Math.min(viewportH - PAD, triggerRect.bottom + 4) + 'px';
        dropdown.style.bottom = 'auto';
      }

      const rect = dropdown.getBoundingClientRect();
      if (rect.left < PAD) {
        wrapper.classList.add('dp-dropdown-align-start');
        dropdown.style.right = 'auto';
        dropdown.style.left = PAD + 'px';
      }
    });
  }

  global.positionDpDropdown = positionDropdown;
  global.resetDpDropdownPosition = resetDropdownPosition;

  function isOpen(wrapper) {
    return !!(wrapper && wrapper.classList.contains('open'));
  }

  function bindTrigger(trigger, onToggle) {
    if (!trigger || typeof onToggle !== 'function') return;
    if (trigger.__dpDropdownAbort) {
      try { trigger.__dpDropdownAbort.abort(); } catch (e) { /* ignore */ }
    }
    const ac = new AbortController();
    trigger.__dpDropdownAbort = ac;
    trigger.dataset.dpDropdownBound = '1';
    let lastToggleAt = 0;
    const runToggle = (e) => {
      if (e && typeof e.button === 'number' && e.button !== 0) return;
      e?.preventDefault?.();
      e?.stopPropagation?.();
      lastToggleAt = Date.now();
      onToggle(e);
    };
    const listenOpts = { signal: ac.signal };
    trigger.addEventListener('pointerdown', runToggle, listenOpts);
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (Date.now() - lastToggleAt > 400) runToggle(e);
    }, listenOpts);
  }

  function bindOutsideClose(getWrapper, onClose) {
    if (typeof getWrapper !== 'function' || typeof onClose !== 'function') return;
    if (global.__dpDropdownOutsideBound) return;
    global.__dpDropdownOutsideBound = true;
    global.addEventListener('pointerdown', (e) => {
      const target = e.target;
      const wrapper = getWrapper();
      if (!isOpen(wrapper)) return;
      if (target instanceof Node && wrapper.contains(target)) return;
      onClose(e);
    });
  }

  global.bindDpDropdownTrigger = bindTrigger;
  global.bindDpDropdownOutsideClose = bindOutsideClose;

  global.addEventListener('resize', () => {
    document.querySelectorAll('.dp-badge-wrapper.open').forEach(positionDropdown);
  });
})(typeof window !== 'undefined' ? window : globalThis);