'use client';

type Props = {
  name: string;
  email: string;
  linkedinUrl: string;
  previousInteraction: string;
  extraLinks: string;
  busy?: boolean;
  onChange: (patch: Partial<{
    name: string;
    email: string;
    linkedinUrl: string;
    previousInteraction: string;
    extraLinks: string;
  }>) => void;
  onSubmit: () => void;
};

export default function WorkgroupInviteResearchForm({
  name,
  email,
  linkedinUrl,
  previousInteraction,
  extraLinks,
  busy,
  onChange,
  onSubmit,
}: Props) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-slate-300">Name</span>
          <input
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            disabled={busy}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => onChange({ email: e.target.value })}
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            disabled={busy}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-slate-300">LinkedIn URL (optional)</span>
        <input
          value={linkedinUrl}
          onChange={(e) => onChange({ linkedinUrl: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          disabled={busy}
          placeholder="https://linkedin.com/in/…"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-300">Previous interaction (optional)</span>
        <textarea
          value={previousInteraction}
          onChange={(e) => onChange({ previousInteraction: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          disabled={busy}
          placeholder="How you know them, recent conversation, shared context…"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-300">Extra links (optional, one per line)</span>
        <textarea
          value={extraLinks}
          onChange={(e) => onChange({ extraLinks: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          disabled={busy}
        />
      </label>
      <button
        type="submit"
        disabled={busy || !name.trim() || !email.trim()}
        className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
      >
        {busy ? 'Researching…' : 'Research contact'}
      </button>
    </form>
  );
}
