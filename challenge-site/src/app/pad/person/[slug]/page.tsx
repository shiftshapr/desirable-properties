import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PersonPadClient from '@/components/onboard/PersonPadClient';
import { isPersonSlug } from '@/lib/hermes-onboard/person-pad-lookup';
import { loadPersonPad } from '@/lib/hermes-onboard/person-pad-store';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const record = await loadPersonPad(slug);
  if (!record) return { title: 'Person landing pad' };
  return {
    title: `${record.displayName} – DP Studio person pad`,
    description: 'A person landing pad built from public profile links and work.',
  };
}

export default async function PersonPadPage({ params }: { params: Params }) {
  const { slug } = await params;
  if (!isPersonSlug(slug)) notFound();

  const record = await loadPersonPad(slug);
  if (!record) notFound();

  return <PersonPadClient initial={record} />;
}
