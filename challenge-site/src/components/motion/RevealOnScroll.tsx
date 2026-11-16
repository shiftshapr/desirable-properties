'use client';

import { useEffect } from 'react';

/**
 * Fades (and slightly lifts) marked elements in as they scroll into view, once each.
 *
 * Mark elements in server markup:
 *   data-reveal            the element itself fades in
 *   data-reveal-stagger    each direct child fades in, with a small stagger (card grids, lists)
 *
 * Nothing is hidden by markup or CSS alone: this component only sets data-reveal-state="hidden" on
 * elements that are below the fold once it has mounted, so content stays visible without JavaScript,
 * for reduced-motion visitors (no-op), and for automated browsers (navigator.webdriver; add
 * ?motion=1 to preview). Styles live in globals.css (opacity + transform only, so no layout shift).
 */
const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 6;

export default function RevealOnScroll() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let forced = false;
    try {
      forced = new URLSearchParams(window.location.search).get('motion') === '1';
    } catch {
      forced = false;
    }
    if (navigator.webdriver && !forced) return;

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-stagger] > *'),
    );
    const foldLine = window.innerHeight * 0.92;

    const show = (el: HTMLElement, delayMs: number) => {
      el.style.transitionDelay = delayMs ? `${delayMs}ms` : '';
      el.dataset.revealState = 'shown';
      const clear = () => {
        el.style.transitionDelay = '';
        el.removeEventListener('transitionend', clear);
      };
      el.addEventListener('transitionend', clear);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const perParent = new Map<Element | null, number>();
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          let delay = 0;
          if (el.parentElement?.hasAttribute('data-reveal-stagger')) {
            const step = perParent.get(el.parentElement) ?? 0;
            perParent.set(el.parentElement, step + 1);
            delay = Math.min(step, MAX_STAGGER_STEPS) * STAGGER_MS;
          }
          show(el, delay);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    for (const el of targets) {
      if (el.dataset.revealState) continue;
      // Already on screen at mount: leave it alone (no flash of hidden content).
      if (el.getBoundingClientRect().top < foldLine) continue;
      el.dataset.revealState = 'hidden';
      observer.observe(el);
    }

    const revealAll = () => {
      for (const el of targets) {
        if (el.dataset.revealState === 'hidden') show(el, 0);
      }
      observer.disconnect();
    };
    window.addEventListener('beforeprint', revealAll);

    return () => {
      observer.disconnect();
      window.removeEventListener('beforeprint', revealAll);
      // Leave nothing hidden if the page unmounts mid-scroll (client navigation).
      for (const el of targets) {
        if (el.dataset.revealState === 'hidden') delete el.dataset.revealState;
      }
    };
  }, []);

  return null;
}
