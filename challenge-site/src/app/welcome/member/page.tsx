import type { Metadata } from 'next';
import DpWelcomeView from '@/components/DpWelcomeView';
import { fetchWorkgroupBySlug } from '@/lib/dp-welcome-workgroup';

export const metadata: Metadata = {
  title: 'Welcome – Desirable Properties Challenge',
  description: 'Your welcome guide for joining a Desirable Properties workgroup.',
};

type Props = {
  searchParams: Promise<{ wg?: string }>;
};

export default async function WelcomeMemberPage({ searchParams }: Props) {
  const params = await searchParams;
  const slug = (params.wg || '').trim();
  const workgroup = slug ? await fetchWorkgroupBySlug(slug) : null;

  return (
    <DpWelcomeView
      variant="member"
      workgroupSlug={slug || null}
      workgroupName={workgroup?.name ?? null}
    />
  );
}
