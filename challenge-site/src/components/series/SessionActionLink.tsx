import { getSessionAction } from '@/lib/event-series-session-ui';

type Props = {
  recordingUrl: string | null;
  liveUrl: string | null;
  className?: string;
  variant?: 'primary' | 'secondary';
  showPending?: boolean;
};

export default function SessionActionLink({
  recordingUrl,
  liveUrl,
  className = '',
  variant = 'primary',
  showPending = true,
}: Props) {
  const action = getSessionAction({ recordingUrl, liveUrl });
  if (!action) return null;
  if (action.disabled && !showPending) return null;

  const base =
    variant === 'primary'
      ? 'inline-flex rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600'
      : 'rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-400';

  if (action.disabled) {
    return (
      <span
        className={`${base} cursor-not-allowed opacity-50 ${className}`}
        aria-disabled="true"
      >
        {action.label}
      </span>
    );
  }

  return (
    <a
      href={action.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${className}`}
    >
      {action.label}
    </a>
  );
}
