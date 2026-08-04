import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function OnchainAdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next || '/onchain/admin';
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
