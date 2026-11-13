'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { previewPhase, v1Phase, type V1Phase } from '@/lib/dp-v1-phase';

/** The launch phase now, switching at 10am and 11am PT without a reload; staging can preview with ?v1phase=. */
export function useV1Phase(): V1Phase {
  const [phase, setPhase] = useState<V1Phase>(() => v1Phase());
  useEffect(() => {
    const tick = () => setPhase(previewPhase(window.location.hostname, window.location.search) ?? v1Phase());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return phase;
}

/**
 * Wording that changes with the Version 1.0 launch: `before` until 10am PT, `during` the launch gathering
 * (10–11am PT), `after` from 11am PT. `after` defaults to `during`.
 */
export default function V1PhaseText({ before, during, after }: { before: ReactNode; during: ReactNode; after?: ReactNode }) {
  const phase = useV1Phase();
  return <>{phase === 'before' ? before : phase === 'during' ? during : (after ?? during)}</>;
}
