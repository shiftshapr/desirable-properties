'use client';

import { useId } from 'react';
import { DP_BADGE_SEAL_SRC, PEARL_AGENT_DROP_IMAGE } from '@/lib/dp-series-badges';

const TOP_ARC = 'M 90 222 A 228 228 0 0 1 510 222';
const OVERLAY = { cx: 300, cy: 300, r: 200 } as const;
/** Pearl center art: small icon anchored in the lower interior of the seal. */
const PEARL_CENTER = {
  size: OVERLAY.r * 0.32,
  cy: OVERLAY.cy + OVERLAY.r * 0.52,
} as const;

type Props = {
  centerSrc: string;
  topLabel: string;
  /** Pearl agent-drop overlaid on the series center art (PEARL badge variant). */
  pearlOverlaySrc?: string | null;
  size?: number;
  className?: string;
  alt?: string;
  variant?: 'series' | 'pearl';
};

/** DP BRC333 seal wireframe with center overlay and top ring label. */
export default function DpSealBadge({
  centerSrc,
  topLabel,
  pearlOverlaySrc,
  size = 120,
  className = '',
  alt = '',
  variant = 'series',
}: Props) {
  const uid = useId().replace(/:/g, '');
  const topArcId = `topArc-${uid}`;
  const sealClipId = `sealClip-${uid}`;
  const label = topLabel.toUpperCase();
  const isPearl = variant === 'pearl';
  const pearlSrc = pearlOverlaySrc || (isPearl ? PEARL_AGENT_DROP_IMAGE : null);
  const showPearlOverlay = Boolean(pearlSrc);

  const centerSize = OVERLAY.r * 2;
  const centerX = OVERLAY.cx - OVERLAY.r;
  const centerY = OVERLAY.cy - OVERLAY.r;
  const pearlSize = PEARL_CENTER.size;
  const pearlX = OVERLAY.cx - pearlSize / 2;
  const pearlY = PEARL_CENTER.cy - pearlSize / 2;

  return (
    <svg
      viewBox="0 0 600 600"
      width={size}
      height={size}
      role="img"
      aria-label={alt || topLabel}
      className={className}
    >
      <defs>
        <path id={topArcId} d={TOP_ARC} fill="none" />
        <clipPath id={sealClipId}>
          <circle cx={OVERLAY.cx} cy={OVERLAY.cy} r={OVERLAY.r} />
        </clipPath>
      </defs>

      <image href={DP_BADGE_SEAL_SRC} x="0" y="0" width="600" height="600" />
      <image
        href={centerSrc}
        x={centerX}
        y={centerY}
        width={centerSize}
        height={centerSize}
        clipPath={`url(#${sealClipId})`}
        preserveAspectRatio="xMidYMid slice"
      />
      {showPearlOverlay && pearlSrc ? (
        <image
          href={pearlSrc}
          x={pearlX}
          y={pearlY}
          width={pearlSize}
          height={pearlSize}
          clipPath={`url(#${sealClipId})`}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : null}
      <text
        fill="#ffffff"
        fontSize="29"
        fontWeight="700"
        letterSpacing="0.08em"
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
      >
        <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>
    </svg>
  );
}
