'use client';

import { useEffect } from 'react';

/** Open every closed <details> that contains `el`, outermost first. */
function openAncestors(el: Element): boolean {
  let opened = false;
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement && !node.open) {
      // A link to the <details> itself also opens it.
      node.open = true;
      opened = true;
    }
  }
  return opened;
}

function targetFor(hash: string): HTMLElement | null {
  if (!hash || hash === '#') return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

/**
 * Deep links on session pages: a link to an anchor inside a collapsed section opens the section first, so emails,
 * posts and in-page links (phase tracker, "On this page", transcript timestamps) always land on visible content.
 * Smooth scrolling and the sticky-header offset come from CSS (globals.css, `.session-page`).
 */
export default function SessionAnchors() {
  useEffect(() => {
    // Shared link with a hash: the browser has already tried to scroll; open the target's sections and land on it.
    const initial = targetFor(window.location.hash);
    if (initial && openAncestors(initial)) {
      requestAnimationFrame(() => initial.scrollIntoView({ block: 'start' }));
    }

    // Same-page link: open before the browser follows it, so the default jump lands on the open section.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!a) return;
      const el = targetFor(a.getAttribute('href') || '');
      if (!el) return;
      openAncestors(el);
      if (window.location.hash === a.getAttribute('href')) {
        // No hashchange when the hash is unchanged: scroll ourselves.
        e.preventDefault();
        el.scrollIntoView({ block: 'start' });
      }
    };
    const onHash = () => {
      const el = targetFor(window.location.hash);
      if (el && openAncestors(el)) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHash);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);
  return null;
}
