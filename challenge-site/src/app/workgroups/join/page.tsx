import localData from '@/data/desirable-properties.json';
import Link from 'next/link';
import { govhubUrl } from '@/lib/govhub';
import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Join a DP Workgroup · Desirable Properties Challenge',
  description:
    'Browse the 22 workgroups stewarding each Desirable Property and pick the one you want to join or nominate into.',
};

type Role = {
  key: string;
  label: string;
  description: string;
  glyph: string;
};

const ROLES: Role[] = [
  {
    key: 'coordinator',
    label: 'Coordinator',
    description: 'Leads the workgroup, sets agenda, and coordinates contributors.',
    glyph: '★',
  },
  {
    key: 'co_lead',
    label: 'Co-lead',
    description:
      'Shares recruitment, member approvals, and contributor coordination with the lead.',
    glyph: '◫',
  },
  {
    key: 'editor',
    label: 'Editor',
    description: 'Edits drafts, coordinates document revisions, and maintains quality.',
    glyph: '✎',
  },
  {
    key: 'presenter',
    label: 'Presenter',
    description:
      'Presents workgroup output at meetings, webinars, or public sessions.',
    glyph: '◉',
  },
  {
    key: 'facilitator',
    label: 'Facilitator',
    description: 'Facilitates meetings and helps the group reach consensus.',
    glyph: '✦',
  },
  {
    key: 'liaison',
    label: 'Liaison',
    description:
      'Coordinates with other workgroups, layers, or external partners.',
    glyph: '⇄',
  },
  {
    key: 'recorder',
    label: 'Recorder',
    description:
      'Captures meeting notes, decisions, and action items.',
    glyph: '☰',
  },
];

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: 'How do I know which workgroup is right for me?',
    a: "Read each DP's short description and pick the one whose purpose resonates with your interests and skills. You can always join a different workgroup later.",
  },
  {
    q: "What if I don't have time for ongoing commitments?",
    a: 'Some roles are flexible and low-touch. Roles like Recorder or Liaison can be episodic — contribute when you have capacity.',
  },
  {
    q: 'Can I be a member of more than one workgroup?',
    a: 'Yes. Many community members participate across multiple workgroups.',
  },
  {
    q: 'How are Coordinators chosen?',
    a: 'Coordinators can be nominated by anyone in the community, or you can nominate yourself. The layer admin reviews and approves each nomination.',
  },
];

function shortDescription(dp: { description?: string; landing_subtitle?: string }): string {
  const candidates = [dp.landing_subtitle, dp.description].filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0,
  );
  const best = candidates.sort((a, b) => a.length - b.length)[0] ?? '';
  return best.length > 220 ? `${best.slice(0, 217).trimEnd()}…` : best;
}

// Canonical Gov Hub slugs for each of the 22 Desirable Properties workgroups.
// These mirror the `working_group.slug` column in the gov-hub-prod database
// (see `working_group` table, layer_id=22d90c89-...-220dca505402, "The Metaweb").
// The slugs are *not* a naive slugify of the DP `name` – they are curated
// short slugs assigned at workgroup-creation time. A naive slugify produced
// e.g. `dp1-federated-authentication-and-accountability` which 404s on
// `/api/workgroups/by-slug/<slug>/`; the canonical slug is `dp1-federated-auth`.
// Update this map if/when a DP's canonical slug changes on Gov Hub.
const DP_WORKGROUP_SLUGS: Record<string, string> = {
  DP1: 'dp1-federated-auth',
  DP2: 'dp2-participant-agency',
  DP3: 'dp3-adaptive-governance',
  DP4: 'dp4-data-sovereignty',
  DP5: 'dp5-decentralized-namespace',
  DP6: 'dp6-commerce',
  DP7: 'dp7-simplicity-interoperability',
  DP8: 'dp8-collaborative-environment',
  DP9: 'dp9-developer-incentives',
  DP10: 'dp10-education',
  DP11: 'dp11-safe-ethical-ai',
  DP12: 'dp12-community-ai-governance',
  DP13: 'dp13-ai-containment',
  DP14: 'dp14-trust-transparency',
  DP15: 'dp15-security-provenance',
  DP16: 'dp16-roadmap-milestones',
  DP17: 'dp17-financial-sustainability',
  DP18: 'dp18-feedback-reputation',
  DP19: 'dp19-community-engagement',
  DP20: 'dp20-community-ownership',
  DP21: 'dp21-multi-modal',
  DP22: 'dp22-civic-memory-epistemic-continuity',
};

function deriveSlug(dp: { id: string; name?: string }): string {
  const dpId = String(dp.id || '');
  // Use the canonical Gov Hub slug for this DP. This is the slug stored in
  // `working_group.slug` on gov-hub-prod, which `/workgroups/<slug>/` and
  // `/api/workgroups/by-slug/<slug>/` both accept.
  const canonical = DP_WORKGROUP_SLUGS[dpId];
  if (canonical) return canonical;

  // Fallback for any DP id we haven't curated yet – keep the old behaviour
  // so an unknown id still produces a deterministic slug rather than throwing.
  const n = dpId.replace(/^DP/i, '').toLowerCase();
  const nameSlug = String(dp.name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `dp${n}-${nameSlug || 'workgroup'}`;
}

export default async function JoinWorkgroupPage() {
  const dps = localData.desirable_properties;

  return (
    <main className="border-b border-slate-800">
      <section className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Desirable Properties Challenge
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl">
            Join a DP Workgroup
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            Each of the 22 Desirable Properties is stewarded by a dedicated workgroup on Gov Hub.
            Pick the property whose purpose resonates with you, join as a member, or nominate
            yourself (or someone else) for a coordinator or contributor role.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#workgroups"
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-950/40 hover:from-violet-500 hover:to-blue-500"
            >
              Browse all 22 workgroups →
            </a>
            <a
              href="#faq"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              FAQ
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">What is a DP workgroup</h2>
          <p className="mt-3 max-w-3xl text-slate-400">
            A Desirable Properties workgroup is a small, focused team that moves a single
            Desirable Property from concept to working draft. Each workgroup has a charter,
            a coordinator, and a flexible roster of members who contribute as their time
            allows — most collaboration is async, with synchronous time reserved for moments
            that need it.
          </p>
          <p className="mt-3 max-w-3xl text-slate-400">
            There is no requirement to attend every meeting or write every line. Join for the
            parts of the work you care about, and step back when life gets busy.
          </p>
        </div>
      </section>

      <section id="roles" className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">Workgroup roles</h2>
          <p className="mt-3 max-w-3xl text-slate-400">
            Every workgroup is staffed by a small set of contributors. Roles are flexible —
            contribute where you have time and interest.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role) => (
              <li
                key={role.key}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-900/40 text-xl text-violet-200"
                  aria-hidden
                >
                  {role.glyph}
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{role.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {role.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="join-vs-nominate" className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">Join vs Nominate</h2>
          <p className="mt-3 max-w-3xl text-slate-400">
            Two ways to get involved with a workgroup: join it as a member, or nominate
            someone (including yourself) for a coordinator or contributor role.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <h3 className="text-lg font-semibold text-white">Join as a member</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Joining is low-commitment and reversible. As a member you can read drafts,
                comment on proposals, and contribute wherever your time and interest align —
                there is no obligation to attend meetings or write code.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Most workgroups welcome additional members at any point. Use the
                <span className="mx-1 inline-block rounded-md border border-cyan-900/60 bg-cyan-950/30 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                  Join as member
                </span>
                button on any card below to get started.
              </p>
            </div>

            <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <h3 className="text-lg font-semibold text-white">
                Nominate a coordinator (or yourself)
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Nominating puts someone forward for a named role — Coordinator, Editor,
                Presenter, or another contributor position. You can nominate yourself or
                someone else in the community.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                The nominee reviews the nomination first and must accept it before the layer
                admin reviews and approves. Use the
                <span className="mx-1 inline-block rounded-md border border-slate-700 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-slate-200">
                  Nominate
                </span>
                button on any card below — it opens the workgroup page with the form ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="workgroups" className="border-b border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">The 22 workgroups</h2>
          <p className="mt-3 max-w-3xl text-slate-400">
            Each workgroup stewards one Desirable Property — drafting the canonical text,
            reviewing contributions, and proposing updates. Click through to Gov Hub to join
            as a member or nominate a coordinator.
          </p>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dps.map((dp) => {
              const dpId = dp.id as string;
              const name = dp.name as string;
              const slug = deriveSlug(dp);
              const wgHref = govhubUrl(`/workgroups/${slug}/`);
              const nominateHref = `${wgHref}?action=nominate`;
              const summary = shortDescription(dp);

              return (
                <li
                  key={dpId}
                  className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5 transition-colors hover:border-violet-700/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md border border-cyan-900/60 bg-cyan-950/30 px-2 py-0.5 text-xs font-mono font-semibold text-cyan-200">
                      {dpId}
                    </span>
                    <span className="rounded-md border border-emerald-900/50 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                      Open for members
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold leading-snug text-white">
                    {name}
                  </h3>
                  {summary && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                      {summary}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <a
                      href={wgHref}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-700 px-3.5 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                    >
                      Join as member
                      <span aria-hidden>→</span>
                    </a>
                    <a
                      href={nominateHref}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
                    >
                      Nominate
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id="faq" className="border-b border-slate-800">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold text-white">Frequently asked questions</h2>
          <div className="mt-10 space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <details
                key={item.q}
                className="group rounded-xl border border-slate-800 bg-slate-900/40 open:border-violet-700/60 open:bg-slate-900/60"
                open={idx === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-white transition-colors hover:text-cyan-200">
                  <span>{item.q}</span>
                  <span
                    aria-hidden
                    className="text-lg text-slate-400 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 text-slate-300">
                  <p className="leading-relaxed">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900/40">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">Ready to participate?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Pick a workgroup above, or go straight to the Metaweb layer on Gov Hub to
            discover drafts and discussions across all 22 properties.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="#workgroups"
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-950/40 hover:from-violet-500 hover:to-blue-500"
            >
              Browse the 22 workgroups →
            </a>
            <a
              href={govhubUrl('/layers/the-metaweb/')}
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Open Gov Hub
            </a>
            <Link
              href="/"
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              ← Back to Challenge
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}