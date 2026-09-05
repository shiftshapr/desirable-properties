/** Toggle in-page Canopi embed trigger (Go Meta) on workgroup collab tabs. */

declare global {
  interface Window {
    __canopiTriggerEl__?: HTMLElement;
  }
}

export function setCanopiEmbedHostActive(active: boolean): void {
  if (typeof document === 'undefined') return;
  if (active) {
    document.documentElement.setAttribute('data-canopi-embed-host', '1');
  } else {
    document.documentElement.removeAttribute('data-canopi-embed-host');
  }
}

export function setCanopiTriggerVisible(visible: boolean): void {
  if (typeof window === 'undefined') return;
  const el = window.__canopiTriggerEl__;
  if (!el) return;
  if (visible) {
    el.classList.remove('canopi-trigger--hidden');
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    return;
  }
  el.classList.add('canopi-trigger--hidden');
  el.style.setProperty('display', 'none', 'important');
  el.style.setProperty('visibility', 'hidden', 'important');
  el.style.setProperty('pointer-events', 'none', 'important');
}

/** Poll until v1.js stamps __canopiTriggerEl__, then apply visibility. */
export function syncCanopiTriggerVisible(visible: boolean): () => void {
  setCanopiEmbedHostActive(visible);
  setCanopiTriggerVisible(visible);
  const delays = [0, 100, 250, 500, 1000, 2000, 4000];
  const timers = delays.map((ms) => window.setTimeout(() => setCanopiTriggerVisible(visible), ms));
  return () => {
    timers.forEach((id) => window.clearTimeout(id));
  };
}
