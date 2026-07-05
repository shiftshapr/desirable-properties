'use client';

import { useEffect, useState } from 'react';
import {
  formatCountdownParts,
  getCountdownTarget,
} from '@/lib/challengeTimeline';

export type CountdownParts = ReturnType<typeof formatCountdownParts>;

export function useChallengeCountdown(
  initialNow?: string,
  intervalMs = 1000,
): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(() => {
    const now = initialNow ? new Date(initialNow) : new Date();
    const target = getCountdownTarget(now);
    if (!target) return null;
    return formatCountdownParts(target, now);
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const target = getCountdownTarget(now);
      if (!target) {
        setParts(null);
        return;
      }
      setParts(formatCountdownParts(target, now));
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return parts;
}
