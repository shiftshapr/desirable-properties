'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AdminToastKind = 'ok' | 'info' | 'err';

type Toast = {
  id: number;
  kind: AdminToastKind;
  message: string;
};

type ToastContextValue = {
  showToast: (kind: AdminToastKind, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((kind: AdminToastKind, message: string) => {
    if (!message.trim()) return;
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[10001] flex max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-left text-sm shadow-lg ${
              toast.kind === 'err'
                ? 'border-rose-700/60 bg-rose-950/95 text-rose-100'
                : toast.kind === 'info'
                  ? 'border-slate-600 bg-slate-900/95 text-slate-200'
                  : 'border-emerald-700/60 bg-emerald-950/95 text-emerald-100'
            }`}
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (_kind: AdminToastKind, message: string) => {
        if (typeof window !== 'undefined' && message) window.alert(message);
      },
    };
  }
  return ctx;
}
