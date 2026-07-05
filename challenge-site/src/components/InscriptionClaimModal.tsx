'use client';

import { useEffect, useState } from 'react';
import { govhubUrl } from '@/lib/govhub';

export type ClaimKind = 'pci-email' | 'submission';

export type ClaimTarget = {
  kind: ClaimKind;
  inscriptionId: string;
  title: string;
  subtitle?: string;
  manualEntry?: boolean;
};

type Props = {
  target: ClaimTarget | null;
  onClose: () => void;
};

const CLAIM_DEADLINE = 'September 18, 2026';

export default function InscriptionClaimModal({ target, onClose }: Props) {
  const [inscriptionId, setInscriptionId] = useState('');
  const [email, setEmail] = useState('');
  const [taprootAddress, setTaprootAddress] = useState('');
  const [useWeb3Auth, setUseWeb3Auth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!target) return;
    setInscriptionId(target.inscriptionId);
    setEmail('');
    setTaprootAddress('');
    setUseWeb3Auth(false);
    setMessage(null);
    setSubmitting(false);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;

  const previewId = inscriptionId.trim();
  const ordinalsPreview = previewId
    ? `https://ordinals.com/inscription/${previewId}`
    : 'https://ordinals.com';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const claimTarget = target;
    if (!claimTarget) return;

    const id = inscriptionId.trim();
    if (!id) {
      setMessage({ type: 'error', text: 'Enter the inscription ID you are claiming.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.indexOf('@') < 1) {
      setMessage({ type: 'error', text: 'Enter the email address that matches this contribution.' });
      return;
    }

    if (useWeb3Auth) {
      // Send the user to the Gov Hub login, returning to the DP Challenge page (which
      // is a known-good landing on Gov Hub). We drop the `?claim=…` next param because
      // the /onchain route does not exist on Gov Hub and 404s. After sign-in the user
      // lands on a working Gov Hub page where the claim flow is stewarded.
      window.location.href = govhubUrl(
        `/login/?next=${encodeURIComponent('/dp-challenge/')}&show_login=1`,
      );
      return;
    }

    const addr = taprootAddress.trim();
    if (!addr) {
      setMessage({
        type: 'error',
        text: 'Enter a Taproot address, or choose Sign in with Web3Auth to use your custodial wallet.',
      });
      return;
    }

    // The previous /immortalize/ endpoint is not available on Gov Hub. Send the
    // user to the working /dp-challenge/ page with claim details encoded in the
    // URL hash – they reach a real Gov Hub page instead of "Not available".
    setSubmitting(true);
    try {
      const params = new URLSearchParams({
        inscription_id: id,
        email: normalizedEmail,
        taproot_address: addr,
        claim_kind: claimTarget.kind,
        title: claimTarget.title,
      });
      window.location.href = `${govhubUrl('/dp-challenge/')}#claim?${params.toString()}`;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 id="claim-modal-title" className="text-lg font-semibold text-white">
            Claim your inscription
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {target.kind === 'pci-email' ? 'PCI email conversation' : 'Second Call submission'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
            Claims must be completed before <strong>{CLAIM_DEADLINE}</strong>. A confirmation email
            will be sent to the address you provide.
          </div>

          <div>
            <p className="text-sm font-medium text-white">{target.title}</p>
            {target.subtitle && <p className="mt-1 text-xs text-slate-500">{target.subtitle}</p>}
          </div>

          <div>
            <label htmlFor="claim-inscription-id" className="mb-1 block text-sm text-slate-400">
              Inscription ID
            </label>
            <input
              id="claim-inscription-id"
              readOnly={!target.manualEntry && Boolean(target.inscriptionId)}
              required
              value={inscriptionId}
              onChange={(e) => setInscriptionId(e.target.value)}
              placeholder="Paste inscription ID…"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white read-only:text-slate-300"
            />
            <p className="mt-1 text-xs text-slate-500">
              Preview on{' '}
              <a
                href={ordinalsPreview}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:text-cyan-200"
              >
                ordinals.com
              </a>{' '}
              to confirm this matches your contribution.
            </p>
          </div>

          <div>
            <label htmlFor="claim-email" className="mb-1 block text-sm text-slate-400">
              Your email address
            </label>
            <input
              id="claim-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use the address from the original PCI thread or submission intake.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-sm font-medium text-white">Receiving address</p>
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="radio"
                name="wallet-mode"
                checked={!useWeb3Auth}
                onChange={() => setUseWeb3Auth(false)}
                className="mt-1"
              />
              <span>
                Provide a <strong className="text-white">Taproot address</strong> where this
                inscription should be associated
              </span>
            </label>
            {!useWeb3Auth && (
              <input
                type="text"
                value={taprootAddress}
                onChange={(e) => setTaprootAddress(e.target.value)}
                placeholder="bc1p…"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-white"
              />
            )}
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="radio"
                name="wallet-mode"
                checked={useWeb3Auth}
                onChange={() => setUseWeb3Auth(true)}
                className="mt-1"
              />
              <span>
                <strong className="text-white">Sign in with Web3Auth</strong> on Gov Hub – we will
                use your custodial Taproot address for storage
              </span>
            </label>
          </div>

          {message && (
            <p
              className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {message.text}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-60"
            >
              {useWeb3Auth ? 'Continue on Gov Hub' : submitting ? 'Redirecting…' : 'Submit claim → Gov Hub'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
