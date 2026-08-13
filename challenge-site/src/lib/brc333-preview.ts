import { BRC333_SHARED_UI_SCRIPT } from '@/lib/brc333Links';

export const ORDINALS_BASE_URL = 'https://ordinals.com';

export type Brc333Ui = {
  bindInscriptionPreview: (root?: Element | Document | null) => void;
  loadPreview: (insId: string, opts?: { title?: string; label?: string }) => void;
  ensurePillStyles?: () => void;
};

declare global {
  interface Window {
    baseUrl?: string;
    BRC333UI?: Brc333Ui;
  }
}

let loadPromise: Promise<void> | null = null;

/** Load brc333ui-v2.js once from app.brc333.xyz (shared with sat graph / book). */
export function loadBrc333Ui(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.BRC333UI) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    window.baseUrl = ORDINALS_BASE_URL;

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${BRC333_SHARED_UI_SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('brc333ui-v2 failed')), {
        once: true,
      });
      if (window.BRC333UI) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = BRC333_SHARED_UI_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('brc333ui-v2 failed to load'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function bindInscriptionPreviews(root: Element): void {
  if (!window.BRC333UI?.bindInscriptionPreview) return;
  window.BRC333UI.bindInscriptionPreview(root);
}
