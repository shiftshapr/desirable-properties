import type { SessionOccurrence } from '@/lib/sessions/session-phases';
import { SESSION_2026_11_16 } from '@/data/sessions/2026-11-16';
import { SESSION_2026_11_23 } from '@/data/sessions/2026-11-23';

/**
 * Every listening-session occurrence with its own page and phase history. Add a new occurrence here when its page
 * ships: /pads lists it with its current phase (src/lib/pads/session-pads-core.ts).
 */
export const SESSION_OCCURRENCES: readonly SessionOccurrence[] = [SESSION_2026_11_16, SESSION_2026_11_23];
