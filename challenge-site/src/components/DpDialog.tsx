'use client';

import { useEffect, useId, useState } from 'react';

type Variant = 'success' | 'info' | 'warning' | 'danger';

export type DpDialogLink = {
  href: string;
  label: string;
};

type AlertOptions = {
  title: string;
  message: string;
  variant?: Variant;
  confirmLabel?: string;
  links?: DpDialogLink[];
};

type ConfirmOptions = AlertOptions & {
  cancelLabel?: string;
};

const variantStyles: Record<Variant, { border: string; button: string }> = {
  success: {
    border: 'border-emerald-700/60',
    button: 'bg-emerald-700 hover:bg-emerald-600',
  },
  info: {
    border: 'border-cyan-700/60',
    button: 'bg-cyan-700 hover:bg-cyan-600',
  },
  warning: {
    border: 'border-amber-700/60',
    button: 'bg-amber-700 hover:bg-amber-600',
  },
  danger: {
    border: 'border-rose-700/60',
    button: 'bg-rose-700 hover:bg-rose-600',
  },
};

type DialogState =
  | { kind: 'alert'; options: AlertOptions; resolve: () => void }
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void };

let dialogState: DialogState | null = null;
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export const DpDialog = {
  alert(options: AlertOptions): Promise<void> {
    return new Promise((resolve) => {
      dialogState = { kind: 'alert', options, resolve };
      notify();
    });
  },
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      dialogState = { kind: 'confirm', options, resolve };
      notify();
    });
  },
};

export function DpDialogHost() {
  const [current, setCurrent] = useState<DialogState | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    return subscribe(() => setCurrent(dialogState));
  }, []);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (current.kind === 'alert') closeAlert();
        else closeConfirm(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!current) return null;

  const { kind, options } = current;
  const variant = options.variant || 'info';
  const styles = variantStyles[variant];

  function closeAlert() {
    if (dialogState?.kind === 'alert') dialogState.resolve();
    dialogState = null;
    notify();
  }

  function closeConfirm(ok: boolean) {
    if (dialogState?.kind === 'confirm') dialogState.resolve(ok);
    dialogState = null;
    notify();
  }

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/75 p-5"
      onClick={() => (kind === 'alert' ? closeAlert() : closeConfirm(false))}
      role="presentation"
    >
      <div
        className={`w-full max-w-md rounded-xl border bg-slate-900 p-5 shadow-2xl ${styles.border}`}
        role={kind === 'confirm' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="text-base font-semibold text-white">
          {options.title}
        </h3>
        <p id={descId} className="mt-2 text-sm leading-relaxed text-slate-300">
          {options.message}
        </p>
        {options.links?.length ? (
          <ul className="mt-3 space-y-2">
            {options.links.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-cyan-300 underline decoration-cyan-600/60 underline-offset-2 hover:text-cyan-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          {kind === 'confirm' ? (
            <button
              type="button"
              onClick={() => closeConfirm(false)}
              className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              {options.cancelLabel || 'Cancel'}
            </button>
          ) : null}
          <button
            type="button"
            autoFocus
            onClick={() => (kind === 'alert' ? closeAlert() : closeConfirm(true))}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${styles.button}`}
          >
            {options.confirmLabel || (kind === 'confirm' ? 'Confirm' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
}
