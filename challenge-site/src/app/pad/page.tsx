import type { Metadata } from 'next';
import PadIndexContent from '@/components/onboard/PadIndexContent';

export const metadata: Metadata = {
  title: 'Landing pads – DP Studio',
  description:
    'Welcome to our Pad: dialogue-first landing pads in Desirable Properties Studio (public beta).',
};

export default async function PadIndexPage() {
  return <PadIndexContent />;
}
