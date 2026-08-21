'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import EcosystemNodeCard from '@/components/ecosystem/EcosystemNodeCard';
import {
  DEFAULT_ECOSYSTEM_VIEW,
  ECOSYSTEM_VIEWS,
  getEcosystemNode,
  type EcosystemMapViewId,
} from '@/data/ecosystem-map';

function FlowArrow({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center text-slate-600 ${className}`}
      aria-hidden
    >
      <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
        <path
          d="M0 8h20m0 0-5-5m5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function LoopReturnArrow() {
  return (
    <p className="text-center text-sm text-slate-500">
      <span aria-hidden className="mr-1">
        ↺
      </span>
      Published work returns to Gov Hub for the next revision cycle.
    </p>
  );
}

function NodeRow({
  nodeIds,
  highlightId,
  compact = false,
}: {
  nodeIds: string[];
  highlightId?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
      {nodeIds.map((id, index) => {
        const node = getEcosystemNode(id);
        if (!node) return null;
        return (
          <div key={id} className="flex min-w-[9rem] flex-1 items-stretch sm:min-w-[10rem]">
            <div className="min-w-0 flex-1">
              <EcosystemNodeCard
                node={node}
                highlighted={highlightId === id}
                compact={compact}
              />
            </div>
            {index < nodeIds.length - 1 ? <FlowArrow className="hidden sm:flex" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function HereView() {
  const view = ECOSYSTEM_VIEWS.find((v) => v.id === 'here');
  if (!view?.groups) return null;

  const [defineGroup, buildGroup] = view.groups;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
        <div className="flex min-w-0 flex-[3] flex-wrap items-stretch gap-2 sm:gap-3">
          {(defineGroup.nodeIds ?? []).map((id, index) => {
            const node = getEcosystemNode(id);
            if (!node) return null;
            return (
              <div key={id} className="flex min-w-[9rem] flex-1 items-stretch">
                <div className="min-w-0 flex-1">
                  <EcosystemNodeCard
                    node={node}
                    highlighted={view.highlightId === id}
                  />
                </div>
                {index < (defineGroup.nodeIds ?? []).length - 1 ? (
                  <FlowArrow className="hidden lg:flex" />
                ) : null}
              </div>
            );
          })}
        </div>

        <FlowArrow className="self-center xl:rotate-0" />

        <div className="min-w-0 flex-[2] rounded-xl border border-violet-900/40 bg-violet-950/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-400">
            {buildGroup.title}
          </p>
          {buildGroup.subtitle ? (
            <p className="mt-1 text-sm text-slate-400">{buildGroup.subtitle}</p>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(buildGroup.nodeIds ?? []).map((id) => {
              const node = getEcosystemNode(id);
              if (!node) return null;
              return <EcosystemNodeCard key={id} node={node} compact />;
            })}
          </div>
        </div>
      </div>

      {view.tagline ? (
        <p className="border-t border-slate-800 pt-6 text-center text-lg font-medium text-slate-200">
          {view.tagline}
        </p>
      ) : null}
    </div>
  );
}

function ForkView() {
  const view = ECOSYSTEM_VIEWS.find((v) => v.id === 'fork');
  if (!view?.groups) return null;

  const [substrateGroup, spaceGroup, particularGroup] = view.groups;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          {substrateGroup.title}
        </h3>
        {substrateGroup.body ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
            {substrateGroup.body}
          </p>
        ) : null}
      </section>

      <div className="flex justify-center" aria-hidden>
        <FlowArrow className="rotate-90" />
      </div>

      <section className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-5 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-400">
          {spaceGroup.title}
        </h3>
        {spaceGroup.subtitle ? (
          <p className="mt-2 text-lg font-semibold text-white">{spaceGroup.subtitle}</p>
        ) : null}
        {spaceGroup.body ? (
          <p className="mt-4 text-sm leading-relaxed text-slate-400">{spaceGroup.body}</p>
        ) : null}
        {spaceGroup.nodeIds && spaceGroup.nodeIds.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {spaceGroup.nodeIds.map((id) => {
              const node = getEcosystemNode(id);
              if (!node) return null;
              return <EcosystemNodeCard key={id} node={node} compact />;
            })}
          </div>
        ) : null}
      </section>

      <div className="flex justify-center" aria-hidden>
        <FlowArrow className="rotate-90" />
      </div>

      <section className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-5 sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-400">
          {particularGroup.title}
        </h3>
        {particularGroup.subtitle ? (
          <p className="mt-2 text-lg font-semibold text-white">{particularGroup.subtitle}</p>
        ) : null}
        {particularGroup.principle ? (
          <blockquote className="mt-4 border-l-2 border-violet-600/70 pl-4 text-sm font-medium leading-relaxed text-slate-200">
            {particularGroup.principle}
          </blockquote>
        ) : null}
        {particularGroup.body ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{particularGroup.body}</p>
        ) : null}
        {particularGroup.nodeIds && particularGroup.nodeIds.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {particularGroup.nodeIds.map((id) => {
              const node = getEcosystemNode(id);
              if (!node) return null;
              return <EcosystemNodeCard key={id} node={node} compact />;
            })}
          </div>
        ) : null}
      </section>

      {view.failureMode ? (
        <section className="rounded-xl border border-amber-900/50 border-dashed bg-amber-950/10 p-5 sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-400/90">
            {view.failureMode.title}
          </h3>
          <p className="mt-2 text-lg font-semibold text-white">{view.failureMode.subtitle}</p>
          <div
            className="mt-5 space-y-1 font-mono text-sm leading-relaxed text-amber-200/90"
            aria-hidden="true"
          >
            <p>You</p>
            <p className="text-slate-500">↓</p>
            <p>AI</p>
            <p className="text-slate-500">↓</p>
            <p className="text-slate-300">Everything Else</p>
          </div>
          <p className="sr-only">{view.failureMode.architecture}</p>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">{view.failureMode.body}</p>
          <p className="mt-4 text-sm font-medium leading-relaxed text-amber-200/90">
            {view.failureMode.warning}
          </p>
        </section>
      ) : null}

      {view.footnote ? (
        <p className="text-sm leading-relaxed text-slate-500">{view.footnote}</p>
      ) : null}

      <p className="text-sm text-slate-500">
        Read the full argument in{' '}
        <Link
          href="/perspectives/a-fork-in-the-web"
          className="font-medium text-cyan-300 hover:text-cyan-200"
        >
          A Fork in the Web
        </Link>{' '}
        and the{' '}
        <Link
          href="/pathways/ai-human-agency"
          className="font-medium text-cyan-300 hover:text-cyan-200"
        >
          AI &amp; Human Agency pathway
        </Link>
        .
      </p>
    </div>
  );
}

function LoopView() {
  const view = ECOSYSTEM_VIEWS.find((v) => v.id === 'loop');
  if (!view?.groups) return null;

  const [inputGroup, governGroup, publishGroup] = view.groups;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-400">
          {inputGroup.title}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(inputGroup.nodeIds ?? []).map((id) => {
            const node = getEcosystemNode(id);
            if (!node) return null;
            return <EcosystemNodeCard key={id} node={node} compact />;
          })}
        </div>
      </section>

      <div className="flex justify-center">
        <FlowArrow className="rotate-90" />
      </div>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-400">
          {governGroup.title}
        </h3>
        <NodeRow nodeIds={governGroup.nodeIds ?? []} compact />
      </section>

      <div className="flex justify-center">
        <FlowArrow className="rotate-90" />
      </div>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-400">
          {publishGroup.title}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(publishGroup.nodeIds ?? []).map((id) => {
            const node = getEcosystemNode(id);
            if (!node) return null;
            return <EcosystemNodeCard key={id} node={node} />;
          })}
        </div>
      </section>

      <LoopReturnArrow />

      {view.footnote ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm leading-relaxed text-slate-400">
          {view.footnote}
        </p>
      ) : null}
    </div>
  );
}

export default function EcosystemMap() {
  const [activeView, setActiveView] = useState<EcosystemMapViewId>(DEFAULT_ECOSYSTEM_VIEW);

  const view = useMemo(
    () => ECOSYSTEM_VIEWS.find((v) => v.id === activeView) ?? ECOSYSTEM_VIEWS[0],
    [activeView],
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Ecosystem map views"
        className="flex flex-wrap gap-2"
      >
        {ECOSYSTEM_VIEWS.map((item) => {
          const selected = item.id === activeView;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`ecosystem-panel-${item.id}`}
              id={`ecosystem-tab-${item.id}`}
              onClick={() => setActiveView(item.id)}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                selected
                  ? 'bg-cyan-700 text-white shadow-md shadow-cyan-950/40'
                  : 'border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-400">{view.description}</p>

      <div
        id={`ecosystem-panel-${view.id}`}
        role="tabpanel"
        aria-labelledby={`ecosystem-tab-${view.id}`}
        className="mt-8 rounded-xl border border-slate-800 bg-slate-950/40 p-5 sm:p-8"
      >
        {activeView === 'here' ? <HereView /> : null}
        {activeView === 'fork' ? <ForkView /> : null}
        {activeView === 'loop' ? <LoopView /> : null}
      </div>

      <aside className="mt-8 rounded-xl border border-slate-800 bg-slate-900/30 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-400">
          Legend
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-semibold text-white">We are here</dt>
            <dd className="mt-1 text-sm leading-relaxed text-slate-400">
              The highlighted node marks where the Desirable Properties Challenge is focused today:
              refining Version 1.0 before ML-REQs and ML-ADRs gate what ships on the Overweb.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-white">Space for layers</dt>
            <dd className="mt-1 text-sm leading-relaxed text-slate-400">
              The fork from{' '}
              <Link href="/perspectives/a-fork-in-the-web" className="text-cyan-300 hover:text-cyan-200">
                A Fork in the Web
              </Link>
              : substrate, architectural space, and particular layers as inhabitants. Not a speed
              axis. AI-mediated awareness is shown as a failure mode – not a product.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-white">Status chips</dt>
            <dd className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-emerald-800/60 bg-emerald-950/50 px-2 py-0.5 font-semibold uppercase tracking-wide text-emerald-200">
                Live
              </span>
              <span className="rounded-full border border-amber-800/60 bg-amber-950/40 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-200">
                In progress
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 font-semibold uppercase tracking-wide text-slate-400">
                Coming
              </span>
            </dd>
            <dd className="mt-2 text-sm leading-relaxed text-slate-400">
              Clickable cards link only to live destinations. ML-REQs and ML-ADRs have no page yet;
              hover or read the card for context.
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
