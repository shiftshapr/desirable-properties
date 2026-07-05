'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type Frame = 'today' | 'wip' | 'coordination';

const LAYER_LABELS = [
  {
    id: 'physical',
    title: 'Physical Infrastructure',
    className: 'right-[6%] bottom-[20%] md:right-[12%] md:bottom-[22%]',
  },
  {
    id: 'internet',
    title: 'Internet Infrastructure',
    className: 'right-[6%] bottom-[36%] md:right-[12%] md:bottom-[38%]',
  },
  {
    id: 'websites',
    title: 'Websites & Applications',
    className: 'right-[6%] bottom-[52%] md:right-[12%] md:bottom-[54%]',
  },
] as const;

const META_LAYER_LABEL = {
  title: 'META-LAYER',
  subtitle: 'Trust · Context · Presence · Governance',
  className: 'right-[5%] top-[10%] md:right-[10%] md:top-[12%]',
};

const LABEL_STAGGER_MS = 550;
const AFTER_LABELS_WIP_DELAY_MS = 700;
const CROSSFADE_MS = 1400;

type Props = {
  workgroupHref: string;
};

export default function LayerHero({ workgroupHref }: Props) {
  const [visibleLabels, setVisibleLabels] = useState(0);
  const [frame, setFrame] = useState<Frame>('today');
  const [showMetaLabel, setShowMetaLabel] = useState(false);
  const [awaitingMovement, setAwaitingMovement] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const advancedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    setMotionReady(true);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const advanceToCoordination = useCallback(() => {
    if (advancedRef.current || frame === 'coordination') return;
    advancedRef.current = true;
    setFrame('coordination');
    setShowMetaLabel(true);
    setAwaitingMovement(false);
  }, [frame]);

  useEffect(() => {
    if (!motionReady) return;

    if (reducedMotion) {
      setVisibleLabels(LAYER_LABELS.length);
      setFrame('coordination');
      setShowMetaLabel(true);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    LAYER_LABELS.forEach((_, index) => {
      timers.push(
        setTimeout(() => setVisibleLabels(index + 1), LABEL_STAGGER_MS * (index + 1)),
      );
    });

    const wipAt = LABEL_STAGGER_MS * LAYER_LABELS.length + AFTER_LABELS_WIP_DELAY_MS;
    timers.push(
      setTimeout(() => {
        setFrame('wip');
        setAwaitingMovement(true);
      }, wipAt),
    );

    return () => timers.forEach(clearTimeout);
  }, [motionReady, reducedMotion]);

  useEffect(() => {
    if (!awaitingMovement || reducedMotion) return;

    const onActivity = () => advanceToCoordination();

    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });
    window.addEventListener('wheel', onActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('wheel', onActivity);
    };
  }, [awaitingMovement, advanceToCoordination, reducedMotion]);

  const frameOpacity = (target: Frame) => (frame === target ? 1 : 0);

  return (
    <section
      className="relative h-[88vh] min-h-[640px] w-full overflow-hidden border-b border-slate-800"
      style={
        {
          '--crossfade-ms': `${CROSSFADE_MS}ms`,
          // Keep hero images contained if CSS fails to load (avoids full-viewport overlay).
          position: 'relative',
          overflow: 'hidden',
        } as React.CSSProperties
      }
    >
      {/* Full-panel image stack */}
      <div className="absolute inset-0 bg-black">
        <Image
          src="/images/today-web.png"
          alt="Today's web: physical, internet, and application layers above the city"
          fill
          priority
          className="object-cover object-center transition-opacity duration-[var(--crossfade-ms)] ease-in-out"
          style={{ opacity: frameOpacity('today') }}
          sizes="100vw"
        />
        <Image
          src="/images/work-in-progress.png"
          alt="Meta-Layer under construction with scaffolding and cranes"
          fill
          className="object-cover object-center transition-opacity duration-[var(--crossfade-ms)] ease-in-out"
          style={{ opacity: frameOpacity('wip') }}
          sizes="100vw"
        />
        <Image
          src="/images/coordination-layer.png"
          alt="Completed Meta-Layer coordination dome with trust, context, presence, and governance"
          fill
          className="object-cover object-center transition-opacity duration-[var(--crossfade-ms)] ease-in-out"
          style={{ opacity: frameOpacity('coordination') }}
          sizes="100vw"
        />
      </div>

      {/* Readability scrim for left-side copy */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-transparent md:from-slate-950/90 md:via-slate-950/50 md:to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20"
        aria-hidden
      />

      {/* Layer labels over the image */}
      {LAYER_LABELS.map((label, index) => (
        <div
          key={label.id}
          className={`pointer-events-none absolute z-20 ${label.className} max-w-[40%] transition-all duration-500 md:max-w-[28%] ${
            index < visibleLabels ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          <span className="rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm sm:text-xs">
            {label.title}
          </span>
        </div>
      ))}

      <div
        className={`pointer-events-none absolute z-20 ${META_LAYER_LABEL.className} max-w-[44%] transition-all duration-700 md:max-w-[30%] ${
          showMetaLabel ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <div className="rounded-lg bg-black/65 px-3 py-2 backdrop-blur-sm">
          <p className="text-sm font-bold tracking-wide text-violet-200 sm:text-base">
            {META_LAYER_LABEL.title}
          </p>
          <p className="mt-0.5 text-[10px] text-violet-100/90 sm:text-xs">
            {META_LAYER_LABEL.subtitle}
          </p>
        </div>
      </div>

      {/* Copy – fixed position so image crossfades never shift layout */}
      <div
        className="absolute inset-x-0 top-0 z-10 mx-auto max-w-6xl px-4 pt-[14vh] sm:px-6 sm:pt-[16vh]"
        style={{ position: 'absolute', zIndex: 10, left: 0, right: 0, top: 0 }}
      >
        <div className="max-w-xl lg:max-w-2xl">
          <h1 className="text-4xl font-bold leading-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">
            The Desirable Properties Challenge
          </h1>
          <p className="mt-6 text-xl leading-relaxed text-slate-100 drop-shadow-sm">
            Help define the foundational properties of a trustworthy Meta-Layer for the Internet.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">
            A global collaboration to build a human-aligned, decentralized, AI-assisted coordination
            layer that supports trust, agency, accountability, and human flourishing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#dps"
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-violet-950/40 hover:from-violet-500 hover:to-blue-500"
            >
              Explore the DPs →
            </a>
            <Link
              href="/challenge#timeline"
              className="rounded-lg border border-white/25 bg-black/30 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm hover:border-white/40 hover:bg-black/45"
            >
              Challenge timeline
            </Link>
            <a
              href={workgroupHref}
              className="rounded-lg border border-white/25 bg-black/30 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm hover:border-white/40 hover:bg-black/45"
            >
              Join a Workgroup
            </a>
          </div>
          <p
            aria-live="polite"
            className={`mt-6 min-h-[1.25rem] text-sm text-violet-200 transition-opacity duration-300 ${
              awaitingMovement && frame === 'wip' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Move, scroll, or touch to reveal the coordination layer
          </p>
        </div>
      </div>
    </section>
  );
}
