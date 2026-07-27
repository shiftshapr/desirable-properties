'use client';

import type { ContributionHint, ContributionScope } from '@/lib/hermesContribution';

interface HermesContributionCTAProps {
  hint: ContributionHint;
  busy?: boolean;
  signedIn: boolean;
  onDraft: (scope: ContributionScope) => void;
  onSignIn: () => void;
}

export default function HermesContributionCTA({
  hint,
  busy = false,
  signedIn,
  onDraft,
  onSignIn,
}: HermesContributionCTAProps) {
  if (!hint.contributionReady) return null;

  const scope = hint.recommendedScope || 'message';
  const reason = hint.reason || 'This looks ready to file on Gov Hub.';

  const primaryClass =
    'rounded-lg bg-cyan-700 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-600 disabled:opacity-50';
  const secondaryClass =
    'rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-cyan-600 disabled:opacity-50';

  const renderButtons = () => {
    if (scope === 'ambiguous') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => (signedIn ? onDraft('message') : onSignIn())}
            className={primaryClass}
          >
            {busy ? 'Drafting…' : 'Contribution from this message'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => (signedIn ? onDraft('thread') : onSignIn())}
            className={secondaryClass}
          >
            Contribution from full thread
          </button>
        </div>
      );
    }

    const label =
      scope === 'thread'
        ? 'Turn this thread into a DP contribution'
        : 'Turn this into a DP contribution';

    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => (signedIn ? onDraft(scope) : onSignIn())}
        className={primaryClass}
      >
        {busy ? 'Drafting…' : label}
      </button>
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-700/40 bg-amber-950/20 px-3 py-3">
      <p className="text-xs text-amber-100/90">{reason}</p>
      {scope === 'ambiguous' ? (
        <p className="mt-1 text-[11px] text-slate-400">
          Hermes wasn&apos;t sure which you meant — pick one.
        </p>
      ) : null}
      <div className="mt-2">{renderButtons()}</div>
      {!signedIn ? (
        <p className="mt-2 text-[11px] text-slate-400">Sign in to draft and submit on Gov Hub.</p>
      ) : null}
    </div>
  );
}
