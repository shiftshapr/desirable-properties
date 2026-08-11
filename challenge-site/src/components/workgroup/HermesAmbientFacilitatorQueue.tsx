'use client';

import HermesAmbientHandBadge from '@/components/workgroup/HermesAmbientHandBadge';
import type { HermesHand } from '@/lib/hermes-ambient-types';

type Props = {
  pending: HermesHand[];
  onOpen: (hand: HermesHand) => void;
};

export default function HermesAmbientFacilitatorQueue({ pending, onOpen }: Props) {
  if (!pending.length) return null;

  return (
    <section className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3">
      <h3 className="text-sm font-medium text-amber-200">Notes ready to share</h3>
      <p className="mt-1 text-xs text-amber-200/70">
        Opened Hermes notes awaiting share to the room (visible to you and admins).
      </p>
      <div className="mt-3 space-y-2">
        {pending.map((hand) => (
          <HermesAmbientHandBadge key={hand.id} hand={hand} onOpen={onOpen} compact />
        ))}
      </div>
    </section>
  );
}
