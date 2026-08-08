import type { Metadata } from 'next';
import DpWelcomeView from '@/components/DpWelcomeView';
import { fetchWorkgroupBySlug, getRequestedWorkgroupSlug } from '@/lib/dp-welcome-workgroup';

export const metadata: Metadata = {
  title: 'Welcome – Workgroup coordinator – Desirable Properties Challenge',
  description:
    'Combined member + coordinator welcome for approved Desirable Properties workgroup coordinators.',
};

type Props = {
  searchParams: Promise<{ wg?: string | string[] }>;
};

export default async function WelcomeCoordinatorPage({ searchParams }: Props) {
  const params = await searchParams;
  const slug = getRequestedWorkgroupSlug(params.wg);
  const workgroup = slug ? await fetchWorkgroupBySlug(slug) : null;

  return (
    <DpWelcomeView
      variant="coordinator"
      workgroupSlug={workgroup?.slug ?? null}
      workgroupName={workgroup?.name ?? null}
      dpId={workgroup?.dpId ?? null}
      documentHref={workgroup?.document_href ?? null}
    />
  );
}
