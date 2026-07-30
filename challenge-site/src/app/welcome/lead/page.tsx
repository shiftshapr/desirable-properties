import type { Metadata } from 'next';
import DpWelcomeView from '@/components/DpWelcomeView';
import { fetchWorkgroupBySlug, getRequestedWorkgroupSlug } from '@/lib/dp-welcome-workgroup';

export const metadata: Metadata = {
  title: 'Welcome – Workgroup lead – Desirable Properties Challenge',
  description: 'Combined member + lead welcome for approved Desirable Properties workgroup leads.',
};

type Props = {
  searchParams: Promise<{ wg?: string | string[] }>;
};

export default async function WelcomeLeadPage({ searchParams }: Props) {
  const params = await searchParams;
  const slug = getRequestedWorkgroupSlug(params.wg);
  const workgroup = slug ? await fetchWorkgroupBySlug(slug) : null;

  return (
    <DpWelcomeView
      variant="lead"
      workgroupSlug={workgroup?.slug ?? null}
      workgroupName={workgroup?.name ?? null}
    />
  );
}
