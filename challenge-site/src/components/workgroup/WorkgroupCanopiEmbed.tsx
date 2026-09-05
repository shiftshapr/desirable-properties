'use client';

import { Suspense, useEffect } from 'react';
import CanopiWebEmbed from '@/components/canopi/CanopiWebEmbed';
import { syncCanopiTriggerVisible, setCanopiEmbedHostActive, setCanopiTriggerVisible } from '@/lib/workgroup-canopi-trigger';

type Props = {
  /** When true, show Go Meta trigger and mark page as embed host (Getting Started, Astra, Edit). */
  active: boolean;
};

function CanopiEmbedScript() {
  return <CanopiWebEmbed />;
}

/** Loads Canopi Discuss embed on workgroup collab pages; toggles Go Meta by tab. */
export default function WorkgroupCanopiEmbed({ active }: Props) {
  useEffect(() => {
    const stopPolling = syncCanopiTriggerVisible(active);
    return () => {
      stopPolling();
      setCanopiEmbedHostActive(false);
      setCanopiTriggerVisible(false);
    };
  }, [active]);

  return (
    <Suspense fallback={null}>
      <CanopiEmbedScript />
    </Suspense>
  );
}
