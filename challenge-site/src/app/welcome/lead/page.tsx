import { permanentRedirect } from 'next/navigation';
import { getRequestedWorkgroupSlug } from '@/lib/dp-welcome-workgroup';

type Props = {
  searchParams: Promise<{ wg?: string | string[] }>;
};

/** Legacy route: welcome emails sent before the coordinator rename link here. */
export default async function WelcomeLeadPage({ searchParams }: Props) {
  const params = await searchParams;
  const slug = getRequestedWorkgroupSlug(params.wg);
  permanentRedirect(slug ? `/welcome/coordinator?wg=${encodeURIComponent(slug)}` : '/welcome/coordinator');
}
