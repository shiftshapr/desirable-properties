import type { Metadata } from 'next';
import PadIndexContent from '@/components/onboard/PadIndexContent';

export const metadata: Metadata = {
  title: 'Landing pads – DP Studio',
  description:
    'Welcome to our Pad: dialogue-first landing pads in Desirable Properties Studio (public beta).',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PadIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const initialLookupMode = modeParam === 'person' ? 'person' : 'organization';
  return <PadIndexContent initialLookupMode={initialLookupMode} />;
}
